/** Computed on demand from cycle_logs history — not a table, so there's no
 * "mirrors public.X" note here the way the other interfaces have one. */
export interface FertilityPrediction {
  classification: 'regular' | 'irregular' | 'insufficient_data';
  /** 'history' = derived from logged cycle_logs; 'manual' = a one-off quick estimate
   * from user-supplied last period date + period/cycle length, not yet backed by
   * enough logged history to detect real variability. */
  source: 'history' | 'manual';
  pcosFlag: boolean;
  cycleStats: { count: number; meanLength: number | null; stdDev: number | null };
  lastPeriodStart: string | null;
  /** How many days the most recent logged (or manually entered) period ran — used to
   * shade actual period days on the calendar, not just the single start date. */
  periodDurationDays: number | null;
  nextPeriodEstimate: string | null;
  estimatedOvulationDate: string | null;
  fertileWindow: [string, string] | null;
  /** date (YYYY-MM-DD) -> relative probability, normalized to sum to 1 across the returned range. */
  probabilities: Record<string, number>;
  confidenceScore: number;
  message: string;
}
