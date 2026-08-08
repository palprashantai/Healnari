import { FertilityPrediction } from '@/shared/interfaces/fertility-prediction.interface';

interface CycleLogRow {
  log_date: string;
  flow: string | null;
}

const MS_PER_DAY = 86_400_000;

export const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
};

const daysBetween = (a: string, b: string): number => Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / MS_PER_DAY);

/** Groups consecutive flow-logged days into periods (start date + how many days the
 * streak ran). Reuses the existing cycle_logs.flow field instead of a separate
 * "period start" input, so this works with whatever the patient has already logged
 * via Tracking/Dashboard. */
function derivePeriodStreaks(logs: CycleLogRow[]): { start: string; length: number }[] {
  const flowDates = Array.from(new Set(
    logs.filter(l => l.flow && l.flow.toLowerCase() !== 'none').map(l => l.log_date),
  )).sort();

  const streaks: { start: string; length: number }[] = [];
  let prev: string | null = null;
  for (const date of flowDates) {
    if (!prev || daysBetween(prev, date) > 1) {
      streaks.push({ start: date, length: 1 });
    } else {
      streaks[streaks.length - 1].length++;
    }
    prev = date;
  }
  return streaks;
}

function insufficientData(lastPeriodStart: string | null): FertilityPrediction {
  return {
    classification: 'insufficient_data',
    source: 'history',
    pcosFlag: false,
    cycleStats: { count: 0, meanLength: null, stdDev: null },
    lastPeriodStart,
    periodDurationDays: null,
    nextPeriodEstimate: null,
    estimatedOvulationDate: null,
    fertileWindow: null,
    probabilities: {},
    confidenceScore: 0,
    message: "Log at least two full cycles (mark flow days on the Tracking page) so we can learn your pattern. Once there's enough history, your fertile window prediction will appear here.",
  };
}

function buildMessage(classification: 'regular' | 'irregular', pcosFlag: boolean, estimatedOvulationDate: string, fertileWindow: [string, string], confidenceScore: number): string {
  if (classification === 'regular') {
    const confidenceLabel = confidenceScore >= 0.8 ? 'High' : 'Moderate';
    return `Your cycles have been fairly consistent. Estimated ovulation around ${estimatedOvulationDate}, with a fertile window of ${fertileWindow[0]} to ${fertileWindow[1]}. Confidence: ${confidenceLabel}.`;
  }
  const pcosNote = pcosFlag
    ? " Since you've noted PCOS/PCOD, cycles like this are common — daily LH testing and BBT tracking will narrow this down far more precisely than the calendar alone."
    : ' Daily LH testing or BBT tracking would narrow this down further.';
  return `Your cycles have varied, so this is a wider estimate. Fertile window: ${fertileWindow[0]} to ${fertileWindow[1]}.${pcosNote} Confidence: Low.`;
}

/**
 * Statistical-distribution model for irregular/PCOS-leaning cycles: each past cycle
 * contributes a small Gaussian bump around (cycle_length - 14) days-into-cycle: summing
 * and normalizing those gives a day-wise ovulation probability, from which we take the
 * peak day and the smallest contiguous window covering ~85% of the mass.
 */
function predictIrregular(lastStart: string, cycleLengths: number[]): { estimatedOvulationDate: string; fertileWindow: [string, string]; probabilities: Record<string, number> } {
  const maxLen = Math.max(...cycleLengths, 35);
  const dayProb = new Map<number, number>();
  const SPREAD = 3; // days of Gaussian spread per contributing cycle

  for (const len of cycleLengths) {
    const peak = Math.max(len - 14, 7);
    for (let day = 1; day <= maxLen; day++) {
      const weight = Math.exp(-((day - peak) ** 2) / (2 * SPREAD * SPREAD));
      dayProb.set(day, (dayProb.get(day) || 0) + weight);
    }
  }

  const total = Array.from(dayProb.values()).reduce((a, b) => a + b, 0) || 1;
  for (const [day, val] of dayProb) dayProb.set(day, val / total);

  const sortedByProb = Array.from(dayProb.entries()).sort((a, b) => b[1] - a[1]);
  const peakDay = sortedByProb[0]?.[0] ?? Math.round(cycleLengths[cycleLengths.length - 1] - 14);

  let cumulative = 0;
  const windowDays: number[] = [];
  for (const [day, prob] of sortedByProb) {
    windowDays.push(day);
    cumulative += prob;
    if (cumulative >= 0.85) break;
  }
  const minDay = Math.min(...windowDays);
  const maxDay = Math.max(...windowDays);

  const probabilities: Record<string, number> = {};
  for (const [day, prob] of dayProb) {
    if (Math.abs(day - peakDay) <= 10 && prob > 0.001) {
      probabilities[addDays(lastStart, day - 1)] = +prob.toFixed(4);
    }
  }

  return {
    estimatedOvulationDate: addDays(lastStart, peakDay - 1),
    fertileWindow: [addDays(lastStart, minDay - 1), addDays(lastStart, maxDay - 1)],
    probabilities,
  };
}

/** Calendar model for regular cycles: ovulation ≈ mean_cycle_length - 14, fertile window
 * is the 6 days ending on that estimate. Probability curve is a tight Gaussian for the chart. */
function predictRegular(lastStart: string, meanLength: number): { estimatedOvulationDate: string; fertileWindow: [string, string]; probabilities: Record<string, number> } {
  const ovOffset = Math.max(meanLength - 14, 7);
  const estimatedOvulationDate = addDays(lastStart, ovOffset);
  const fertileWindow: [string, string] = [addDays(estimatedOvulationDate, -5), estimatedOvulationDate];

  const probabilities: Record<string, number> = {};
  const weights: number[] = [];
  for (let offset = -4; offset <= 2; offset++) weights.push(Math.exp(-(offset * offset) / (2 * 1.5 * 1.5)));
  const total = weights.reduce((a, b) => a + b, 0);
  let i = 0;
  for (let offset = -4; offset <= 2; offset++) {
    probabilities[addDays(estimatedOvulationDate, offset)] = +(weights[i] / total).toFixed(4);
    i++;
  }

  return { estimatedOvulationDate, fertileWindow, probabilities };
}

export function computeFertilityPrediction(logs: CycleLogRow[], pcosFlag: boolean): FertilityPrediction {
  const streaks = derivePeriodStreaks(logs);
  const periodStarts = streaks.map(s => s.start);
  if (periodStarts.length < 2) return insufficientData(periodStarts[periodStarts.length - 1] || null);

  const cycleLengths: number[] = [];
  for (let i = 1; i < periodStarts.length; i++) {
    const len = daysBetween(periodStarts[i - 1], periodStarts[i]);
    if (len > 0 && len < 90) cycleLengths.push(len); // discard obviously bad data (e.g. a single skipped log)
  }
  if (cycleLengths.length === 0) return insufficientData(periodStarts[periodStarts.length - 1]);

  const lastStart = periodStarts[periodStarts.length - 1];
  const mean = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  const variance = cycleLengths.reduce((a, b) => a + (b - mean) ** 2, 0) / cycleLengths.length;
  const stdDev = Math.sqrt(variance);

  // Regular: consistent (low spread) and within the ACOG-typical 21–35 day range.
  const isRegular = stdDev <= 3 && mean <= 35;
  const classification = isRegular ? 'regular' : 'irregular';

  const { estimatedOvulationDate, fertileWindow, probabilities } = isRegular
    ? predictRegular(lastStart, mean)
    : predictIrregular(lastStart, cycleLengths);

  const confidenceScore = isRegular
    ? Math.max(0.5, Math.min(0.95, 1 - stdDev / 10))
    : Math.max(0.2, Math.min(0.6, 1 - stdDev / 15));

  const avgPeriodLength = Math.round(streaks.reduce((a, s) => a + s.length, 0) / streaks.length);

  return {
    classification,
    source: 'history',
    pcosFlag,
    cycleStats: { count: cycleLengths.length, meanLength: +mean.toFixed(1), stdDev: +stdDev.toFixed(1) },
    lastPeriodStart: lastStart,
    periodDurationDays: avgPeriodLength,
    nextPeriodEstimate: addDays(lastStart, mean),
    estimatedOvulationDate,
    fertileWindow,
    probabilities,
    confidenceScore: +confidenceScore.toFixed(2),
    message: buildMessage(classification, pcosFlag, estimatedOvulationDate, fertileWindow, confidenceScore),
  };
}

/**
 * One-off estimate from three manually-entered values (last period start, period
 * duration, average cycle length) — the same inputs a simple calendar calculator
 * (WebMD-style) would ask for. Used when there isn't yet enough logged history for
 * computeFertilityPrediction to work from. Always uses the "regular" calendar model
 * since a single manual entry carries no variability information to judge irregularity
 * from — confidence is capped lower than a history-derived regular result to reflect that.
 */
export function computeQuickEstimate(lastPeriodStart: string, periodDurationDays: number, cycleLengthDays: number, pcosFlag: boolean): FertilityPrediction {
  const { estimatedOvulationDate, fertileWindow, probabilities } = predictRegular(lastPeriodStart, cycleLengthDays);
  const confidenceScore = 0.55;

  const pcosNote = pcosFlag
    ? " Since you've noted PCOS/PCOD, treat this as a rough starting point — daily LH testing and BBT tracking will serve you far better than a calendar estimate."
    : '';
  const message = `Based on what you told us (period starting ${lastPeriodStart}, ~${periodDurationDays}-day period, ~${cycleLengthDays}-day cycle), estimated ovulation is around ${estimatedOvulationDate}, with a fertile window of ${fertileWindow[0]} to ${fertileWindow[1]}. This is a one-off estimate, not learned from your history yet — keep logging cycles on the Tracking page for a more precise, personalized prediction.${pcosNote}`;

  return {
    classification: 'regular',
    source: 'manual',
    pcosFlag,
    cycleStats: { count: 1, meanLength: cycleLengthDays, stdDev: null },
    lastPeriodStart,
    periodDurationDays,
    nextPeriodEstimate: addDays(lastPeriodStart, cycleLengthDays),
    estimatedOvulationDate,
    fertileWindow,
    probabilities,
    confidenceScore,
    message,
  };
}
