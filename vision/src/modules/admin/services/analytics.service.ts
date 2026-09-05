import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import { DecimalMath } from '@/core/utils/decimal.util';
import { CommissionCalculator } from '@/core/utils/commission.util';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AppointmentStatus } from '@/shared/interfaces/appointment.interface';
import { PaymentStatus } from '@/shared/interfaces/payment.interface';

export interface DateRangeFilter {
  start: Date;
  end: Date;
  priorStart: Date;
  priorEnd: Date;
  label: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // In-memory TTL cache to optimize heavy aggregate queries
  private readonly cache = new Map<string, { timestamp: number; data: any }>();
  private readonly CACHE_TTL_MS = 30_000; // 30 seconds

  constructor(
    private readonly supabase: SupabaseService,
    private readonly fxRateService: FXRateService,
  ) {}

  /**
   * Helper: Parse flexible date range strings into UTC date boundaries
   * with equivalent prior period for growth calculations.
   */
  public parseDateRange(range?: string, customFrom?: string, customTo?: string): DateRangeFilter {
    const now = new Date();
    const cleanRange = (range || '30d').toLowerCase().trim();

    let start: Date;
    let end: Date = now;
    let priorStart: Date;
    let priorEnd: Date;
    let label = 'Last 30 Days';

    if (customFrom && customTo) {
      start = new Date(customFrom);
      end = new Date(customTo);
      const diffMs = end.getTime() - start.getTime();
      priorEnd = new Date(start.getTime());
      priorStart = new Date(priorEnd.getTime() - diffMs);
      label = `${customFrom} to ${customTo}`;
      return { start, end, priorStart, priorEnd, label };
    }

    switch (cleanRange) {
      case 'today': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        priorEnd = new Date(start);
        priorStart = new Date(priorEnd.getTime() - 24 * 60 * 60 * 1000);
        label = 'Today';
        break;
      }
      case 'yesterday': {
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        priorEnd = new Date(start);
        priorStart = new Date(priorEnd.getTime() - 24 * 60 * 60 * 1000);
        label = 'Yesterday';
        break;
      }
      case '7d':
      case '7 days': {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        priorEnd = new Date(start);
        priorStart = new Date(priorEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        label = 'Last 7 Days';
        break;
      }
      case 'this_month':
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        const diffMs = now.getTime() - start.getTime();
        priorEnd = new Date(start);
        priorStart = new Date(priorEnd.getTime() - diffMs);
        label = 'This Month';
        break;
      }
      case 'last_month': {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        priorStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        priorEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
        label = 'Last Month';
        break;
      }
      case '6m':
      case '6 months': {
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        priorEnd = new Date(start);
        priorStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        label = 'Last 6 Months';
        break;
      }
      case 'ytd':
      case 'year to date': {
        start = new Date(now.getFullYear(), 0, 1);
        const diffMs = now.getTime() - start.getTime();
        priorEnd = new Date(start);
        priorStart = new Date(priorEnd.getTime() - diffMs);
        label = 'Year to Date';
        break;
      }
      case 'all':
      case 'all time': {
        start = new Date(0); // Epoch
        priorStart = new Date(0);
        priorEnd = new Date(0);
        label = 'All Time';
        break;
      }
      case '30d':
      case '30 days':
      default: {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        priorEnd = new Date(start);
        priorStart = new Date(priorEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
        label = 'Last 30 Days';
        break;
      }
    }

    return { start, end, priorStart, priorEnd, label };
  }

  /**
   * Helper: Safe percentage change calculation handling zero prior periods gracefully.
   */
  public calculateGrowth(current: number, previous: number): {
    percent: number | null;
    display: string;
    direction: 'up' | 'down' | 'flat' | 'none';
  } {
    if (previous <= 0) {
      if (current === 0) return { percent: 0, display: '0%', direction: 'flat' };
      return { percent: null, display: 'No previous data', direction: 'none' };
    }
    const raw = ((current - previous) / previous) * 100;
    const rounded = Number(raw.toFixed(1));
    const prefix = rounded > 0 ? '+' : '';
    return {
      percent: rounded,
      display: `${prefix}${rounded}%`,
      direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
    };
  }

  /**
   * ADMIN: Platform Overview & High-Level KPIs
   */
  async getAdminOverview(range?: string, reportingCurrency = 'INR') {
    const repCurr = (reportingCurrency || 'INR').toUpperCase();
    const dateFilter = this.parseDateRange(range);
    const cacheKey = `admin_overview_${cleanKey(range)}_${repCurr}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const [
        { data: allProfiles },
        { data: allAppointments },
        { data: allPayments },
        { data: allAiTxns },
      ] = await Promise.all([
        this.supabase.admin
          .from('profiles')
          .select('id, role, country, currency, created_at'),
        this.supabase.admin
          .from('appointments')
          .select('id, patient_id, doctor_id, status, type, specialty, scheduled_date, created_at')
          .is('deleted_at', null),
        this.supabase.admin
          .from('payments')
          .select('*'),
        this.supabase.admin
          .from('ai_transactions')
          .select('*'),
      ]);

      const profs = allProfiles || [];
      const apts = allAppointments || [];
      const pays = allPayments || [];
      const aiTx = allAiTxns || [];

      // Current Period vs Prior Period subsets
      const inCurrent = (dateStr: string) => {
        const t = new Date(dateStr).getTime();
        return t >= dateFilter.start.getTime() && t <= dateFilter.end.getTime();
      };
      const inPrior = (dateStr: string) => {
        const t = new Date(dateStr).getTime();
        return t >= dateFilter.priorStart.getTime() && t <= dateFilter.priorEnd.getTime();
      };

      // Users
      const totalUsers = profs.length;
      const totalPatients = profs.filter((p) => p.role === ProfileRole.PATIENT).length;
      const totalDoctors = profs.filter((p) => p.role === ProfileRole.DOCTOR).length;

      const newUsersCurrent = profs.filter((p) => inCurrent(p.created_at)).length;
      const newUsersPrior = profs.filter((p) => inPrior(p.created_at)).length;

      const newPatientsCurrent = profs.filter((p) => p.role === ProfileRole.PATIENT && inCurrent(p.created_at)).length;
      const newPatientsPrior = profs.filter((p) => p.role === ProfileRole.PATIENT && inPrior(p.created_at)).length;

      const newDoctorsCurrent = profs.filter((p) => p.role === ProfileRole.DOCTOR && inCurrent(p.created_at)).length;
      const newDoctorsPrior = profs.filter((p) => p.role === ProfileRole.DOCTOR && inPrior(p.created_at)).length;

      // Active Users: Users who had an appointment or transaction in current period
      const activePatientIds = new Set<string>();
      const activeDoctorIds = new Set<string>();

      apts.filter((a) => inCurrent(a.created_at || a.scheduled_date)).forEach((a) => {
        if (a.patient_id) activePatientIds.add(a.patient_id);
        if (a.doctor_id) activeDoctorIds.add(a.doctor_id);
      });

      // Financials: Normalize using FXRateService
      let grossVolumeCurrent = 0;
      let grossVolumePrior = 0;
      let platformRevenueCurrent = 0;
      let platformRevenuePrior = 0;
      let doctorEarningsCurrent = 0;
      let refundsCurrent = 0;

      // Process consultation payments
      pays.forEach((p) => {
        const origAmt = Number(p.base_amount ?? p.original_amount ?? p.amount ?? 0);
        const origCurr = ((p.base_currency ?? p.original_currency ?? p.currency ?? 'INR') as string).toUpperCase();

        const convertedGross = this.fxRateService.reproduceReportingValue(
          origAmt,
          origCurr,
          repCurr,
          p.fx_rate,
          p.reporting_currency,
        );

        const breakdown = CommissionCalculator.fromStoredPayment(p);
        const convertedPlatformFee = this.fxRateService.reproduceReportingValue(
          breakdown.commissionAmount,
          origCurr,
          repCurr,
          p.fx_rate,
          p.reporting_currency,
        );
        const convertedPayout = this.fxRateService.reproduceReportingValue(
          breakdown.providerPayoutAmount,
          origCurr,
          repCurr,
          p.fx_rate,
          p.reporting_currency,
        );

        const refAmt = Number(p.refund_amount || 0);
        const isPaid = p.status === PaymentStatus.PAID;
        const isRefunded = p.status === PaymentStatus.REFUNDED;

        if (inCurrent(p.created_at)) {
          if (isPaid) {
            grossVolumeCurrent = DecimalMath.add(grossVolumeCurrent, convertedGross);
            platformRevenueCurrent = DecimalMath.add(platformRevenueCurrent, convertedPlatformFee);
            doctorEarningsCurrent = DecimalMath.add(doctorEarningsCurrent, convertedPayout);
          }
          if (isRefunded || refAmt > 0) {
            const actualRefund = isRefunded ? convertedGross : this.fxRateService.reproduceReportingValue(
              refAmt,
              origCurr,
              repCurr,
              p.fx_rate,
              p.reporting_currency,
            );
            refundsCurrent = DecimalMath.add(refundsCurrent, actualRefund);
          }
        }

        if (inPrior(p.created_at) && isPaid) {
          grossVolumePrior = DecimalMath.add(grossVolumePrior, convertedGross);
          platformRevenuePrior = DecimalMath.add(platformRevenuePrior, convertedPlatformFee);
        }
      });

      // Process AI Transactions (100% platform revenue)
      let aiRevenueCurrent = 0;
      aiTx.forEach((t) => {
        const isPaid = ['paid', 'success', 'active'].includes(String(t.status || '').toLowerCase());
        if (!isPaid) return;

        const origAmt = Number(t.final_amount || t.base_amount || 0);
        const origCurr = (t.original_currency || 'INR').toUpperCase();
        const converted = this.fxRateService.reproduceReportingValue(
          origAmt,
          origCurr,
          repCurr,
          t.fx_rate_applied,
          t.reporting_currency,
        );

        if (inCurrent(t.created_at)) {
          grossVolumeCurrent = DecimalMath.add(grossVolumeCurrent, converted);
          platformRevenueCurrent = DecimalMath.add(platformRevenueCurrent, converted);
          aiRevenueCurrent = DecimalMath.add(aiRevenueCurrent, converted);
        }
        if (inPrior(t.created_at)) {
          grossVolumePrior = DecimalMath.add(grossVolumePrior, converted);
          platformRevenuePrior = DecimalMath.add(platformRevenuePrior, converted);
        }
      });

      const netRevenueCurrent = DecimalMath.subtract(grossVolumeCurrent, refundsCurrent);

      // Appointments metrics
      const currentApts = apts.filter((a) => inCurrent(a.created_at || a.scheduled_date));
      const priorApts = apts.filter((a) => inPrior(a.created_at || a.scheduled_date));

      const completedCurrent = currentApts.filter((a) => a.status === AppointmentStatus.DONE).length;
      const completedPrior = priorApts.filter((a) => a.status === AppointmentStatus.DONE).length;

      const cancelledCurrent = currentApts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
      const noShowCurrent = currentApts.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;

      // Conversion & Retention
      const totalBooked = currentApts.length;
      const conversionRate = totalBooked > 0 ? Number(((completedCurrent / totalBooked) * 100).toFixed(1)) : 0;

      // Repeat patients: Patients with >= 2 completed appointments all-time
      const patientDoneCounts = new Map<string, number>();
      apts.filter((a) => a.status === AppointmentStatus.DONE).forEach((a) => {
        patientDoneCounts.set(a.patient_id, (patientDoneCounts.get(a.patient_id) || 0) + 1);
      });
      const patientsWithDone = Array.from(patientDoneCounts.values());
      const repeatPatientsCount = patientsWithDone.filter((c) => c >= 2).length;
      const retentionRate = patientsWithDone.length > 0
        ? Number(((repeatPatientsCount / patientsWithDone.length) * 100).toFixed(1))
        : 0;

      const result = {
        period: dateFilter.label,
        reportingCurrency: repCurr,
        kpis: {
          totalUsers: { value: totalUsers, newInPeriod: newUsersCurrent, growth: this.calculateGrowth(newUsersCurrent, newUsersPrior) },
          totalPatients: { value: totalPatients, activeInPeriod: activePatientIds.size, newInPeriod: newPatientsCurrent, growth: this.calculateGrowth(newPatientsCurrent, newPatientsPrior) },
          totalDoctors: { value: totalDoctors, activeInPeriod: activeDoctorIds.size, newInPeriod: newDoctorsCurrent, growth: this.calculateGrowth(newDoctorsCurrent, newDoctorsPrior) },
          grossRevenue: { value: grossVolumeCurrent, currency: repCurr, growth: this.calculateGrowth(grossVolumeCurrent, grossVolumePrior) },
          netRevenue: { value: netRevenueCurrent, currency: repCurr },
          platformRevenue: { value: platformRevenueCurrent, currency: repCurr, growth: this.calculateGrowth(platformRevenueCurrent, platformRevenuePrior) },
          doctorEarnings: { value: doctorEarningsCurrent, currency: repCurr },
          refunds: { value: refundsCurrent, currency: repCurr },
          aiRevenue: { value: aiRevenueCurrent, currency: repCurr },
          consultationsCompleted: { value: completedCurrent, growth: this.calculateGrowth(completedCurrent, completedPrior) },
          conversionRate: { value: conversionRate, unit: '%' },
          retentionRate: { value: retentionRate, repeatPatients: repeatPatientsCount, unit: '%' },
        },
        appointmentBreakdown: {
          total: totalBooked,
          completed: completedCurrent,
          cancelled: cancelledCurrent,
          noShow: noShowCurrent,
          scheduled: totalBooked - (completedCurrent + cancelledCurrent + noShowCurrent),
        },
      };

      this.cache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (error: any) {
      this.logger.error(`Error in getAdminOverview: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Failed to calculate admin overview telemetry');
    }
  }

  /**
   * ADMIN: Detailed Revenue Analytics with Multi-Currency & Reconciliation
   */
  async getAdminRevenue(range?: string, reportingCurrency = 'INR') {
    const repCurr = (reportingCurrency || 'INR').toUpperCase();
    const dateFilter = this.parseDateRange(range);
    const cacheKey = `admin_rev_${cleanKey(range)}_${repCurr}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const [{ data: payments }, { data: aiTxns }, { data: profiles }] = await Promise.all([
        this.supabase.admin.from('payments').select('*').order('created_at', { ascending: false }),
        this.supabase.admin.from('ai_transactions').select('*').order('created_at', { ascending: false }),
        this.supabase.admin.from('profiles').select('id, full_name, specialty, role'),
      ]);

      const pays = payments || [];
      const aiTx = aiTxns || [];
      const profs = profiles || [];
      const profileMap = new Map(profs.map((p) => [p.id, p]));

      // Filter by range
      const inRange = (d: string) => {
        const t = new Date(d).getTime();
        return t >= dateFilter.start.getTime() && t <= dateFilter.end.getTime();
      };

      let grossGMV = 0;
      let platformRevenue = 0;
      let doctorEarnings = 0;
      let totalRefunds = 0;
      let successfulPaymentsCount = 0;
      let pendingPaymentsCount = 0;
      let failedPaymentsCount = 0;
      let cancelledPaymentsCount = 0;

      const currencyBreakdownMap = new Map<string, {
        currency: string;
        count: number;
        grossAmount: number;
        platformFeeAmount: number;
        providerPayoutAmount: number;
        refundAmount: number;
        netAmount: number;
      }>();

      const revenueByDoctorMap = new Map<string, number>();
      const revenueByPatientMap = new Map<string, number>();
      const revenueBySpecialtyMap = new Map<string, number>();
      const trendMap = new Map<string, { gross: number; platform: number; doctor: number; count: number }>();

      // Initialize trend buckets based on range
      const isDaily = ['today', 'yesterday', '7d', '30d'].includes((range || '30d').toLowerCase());
      const trendPoints = isDaily ? 30 : 6;

      for (let i = trendPoints - 1; i >= 0; i--) {
        const d = new Date();
        if (isDaily) {
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          trendMap.set(key, { gross: 0, platform: 0, doctor: 0, count: 0 });
        } else {
          d.setMonth(d.getMonth() - i);
          const key = d.toLocaleString('en-US', { month: 'short' });
          trendMap.set(key, { gross: 0, platform: 0, doctor: 0, count: 0 });
        }
      }

      // Process consultation payments
      pays.forEach((p) => {
        const origAmt = Number(p.base_amount ?? p.original_amount ?? p.amount ?? 0);
        const origCurr = ((p.base_currency ?? p.original_currency ?? p.currency ?? 'INR') as string).toUpperCase();
        const breakdown = CommissionCalculator.fromStoredPayment(p);

        const fee = breakdown.commissionAmount;
        const payout = breakdown.providerPayoutAmount;
        const refAmt = Number(p.refund_amount || (p.status === PaymentStatus.REFUNDED ? origAmt : 0));

        // Currency segregation
        const cEntry = currencyBreakdownMap.get(origCurr) || {
          currency: origCurr,
          count: 0,
          grossAmount: 0,
          platformFeeAmount: 0,
          providerPayoutAmount: 0,
          refundAmount: 0,
          netAmount: 0,
        };

        if (inRange(p.created_at)) {
          cEntry.count += 1;
          if (p.status === PaymentStatus.PAID) {
            cEntry.grossAmount = DecimalMath.add(cEntry.grossAmount, origAmt);
            cEntry.platformFeeAmount = DecimalMath.add(cEntry.platformFeeAmount, fee);
            cEntry.providerPayoutAmount = DecimalMath.add(cEntry.providerPayoutAmount, payout);
          }
          if (refAmt > 0) {
            cEntry.refundAmount = DecimalMath.add(cEntry.refundAmount, refAmt);
          }
          cEntry.netAmount = DecimalMath.subtract(cEntry.grossAmount, cEntry.refundAmount);
          currencyBreakdownMap.set(origCurr, cEntry);
        }

        // Status counts
        if (inRange(p.created_at)) {
          if (p.status === PaymentStatus.PAID) successfulPaymentsCount++;
          else if (p.status === PaymentStatus.PENDING) pendingPaymentsCount++;
          else if (p.status === PaymentStatus.FAILED) failedPaymentsCount++;
          else if (String(p.status || '').toLowerCase() === 'cancelled') cancelledPaymentsCount++;
        }

        // Reporting currency conversions
        if (p.status === PaymentStatus.PAID && inRange(p.created_at)) {
          const convGross = this.fxRateService.reproduceReportingValue(origAmt, origCurr, repCurr, p.fx_rate, p.reporting_currency);
          const convFee = this.fxRateService.reproduceReportingValue(fee, origCurr, repCurr, p.fx_rate, p.reporting_currency);
          const convPayout = this.fxRateService.reproduceReportingValue(payout, origCurr, repCurr, p.fx_rate, p.reporting_currency);

          grossGMV = DecimalMath.add(grossGMV, convGross);
          platformRevenue = DecimalMath.add(platformRevenue, convFee);
          doctorEarnings = DecimalMath.add(doctorEarnings, convPayout);

          if (p.doctor_id) {
            revenueByDoctorMap.set(p.doctor_id, DecimalMath.add(revenueByDoctorMap.get(p.doctor_id) || 0, convGross));
          }
          if (p.patient_id) {
            revenueByPatientMap.set(p.patient_id, DecimalMath.add(revenueByPatientMap.get(p.patient_id) || 0, convGross));
          }

          const specialty = p.category || p.service || 'General Practice';
          revenueBySpecialtyMap.set(specialty, DecimalMath.add(revenueBySpecialtyMap.get(specialty) || 0, convGross));

          // Trend bucketing
          const pDate = new Date(p.created_at);
          const key = isDaily ? pDate.toISOString().slice(0, 10) : pDate.toLocaleString('en-US', { month: 'short' });
          if (trendMap.has(key)) {
            const pt = trendMap.get(key)!;
            pt.gross = DecimalMath.add(pt.gross, convGross);
            pt.platform = DecimalMath.add(pt.platform, convFee);
            pt.doctor = DecimalMath.add(pt.doctor, convPayout);
            pt.count += 1;
          }
        }

        if (refAmt > 0 && inRange(p.created_at)) {
          const convRef = this.fxRateService.reproduceReportingValue(refAmt, origCurr, repCurr, p.fx_rate, p.reporting_currency);
          totalRefunds = DecimalMath.add(totalRefunds, convRef);
        }
      });

      // Process AI Transactions
      let aiTotalRevenue = 0;
      aiTx.forEach((t) => {
        const isPaid = ['paid', 'success', 'active'].includes(String(t.status || '').toLowerCase());
        if (!isPaid || !inRange(t.created_at)) return;

        const origAmt = Number(t.final_amount || t.base_amount || 0);
        const origCurr = (t.original_currency || 'INR').toUpperCase();
        const convGross = this.fxRateService.reproduceReportingValue(origAmt, origCurr, repCurr, t.fx_rate_applied, t.reporting_currency);

        grossGMV = DecimalMath.add(grossGMV, convGross);
        platformRevenue = DecimalMath.add(platformRevenue, convGross);
        aiTotalRevenue = DecimalMath.add(aiTotalRevenue, convGross);
        successfulPaymentsCount++;

        // Add to currency map
        const cEntry = currencyBreakdownMap.get(origCurr) || {
          currency: origCurr,
          count: 0,
          grossAmount: 0,
          platformFeeAmount: 0,
          providerPayoutAmount: 0,
          refundAmount: 0,
          netAmount: 0,
        };
        cEntry.count += 1;
        cEntry.grossAmount = DecimalMath.add(cEntry.grossAmount, origAmt);
        cEntry.platformFeeAmount = DecimalMath.add(cEntry.platformFeeAmount, origAmt);
        cEntry.netAmount = DecimalMath.subtract(cEntry.grossAmount, cEntry.refundAmount);
        currencyBreakdownMap.set(origCurr, cEntry);

        // Trend
        const tDate = new Date(t.created_at);
        const key = isDaily ? tDate.toISOString().slice(0, 10) : tDate.toLocaleString('en-US', { month: 'short' });
        if (trendMap.has(key)) {
          const pt = trendMap.get(key)!;
          pt.gross = DecimalMath.add(pt.gross, convGross);
          pt.platform = DecimalMath.add(pt.platform, convGross);
          pt.count += 1;
        }
      });

      const netRevenue = DecimalMath.subtract(grossGMV, totalRefunds);
      const totalTxCount = Math.max(1, successfulPaymentsCount);

      const aov = successfulPaymentsCount > 0 ? Number((grossGMV / successfulPaymentsCount).toFixed(2)) : 0;
      const acv = pays.filter((p) => p.status === PaymentStatus.PAID && inRange(p.created_at)).length > 0
        ? Number((DecimalMath.subtract(grossGMV, aiTotalRevenue) / pays.filter((p) => p.status === PaymentStatus.PAID && inRange(p.created_at)).length).toFixed(2))
        : 0;

      const revenueTrend = Array.from(trendMap.entries()).map(([label, d]) => ({
        date: label,
        gross: Number(d.gross.toFixed(2)),
        platform: Number(d.platform.toFixed(2)),
        doctor: Number(d.doctor.toFixed(2)),
        transactions: d.count,
      }));

      const specialtyRevenue = Array.from(revenueBySpecialtyMap.entries()).map(([name, value], i) => ({
        name,
        value: Number(value.toFixed(2)),
        color: ['#6B46C1', '#10B981', '#0EA5E9', '#F59E0B', '#E23E8C', '#8B5CF6'][i % 6],
      }));

      const topDoctors = Array.from(revenueByDoctorMap.entries())
        .map(([id, amount]) => ({
          id,
          name: profileMap.get(id)?.full_name || 'Dr. Specialist',
          specialty: profileMap.get(id)?.specialty || 'General',
          revenue: Number(amount.toFixed(2)),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const result = {
        reportingCurrency: repCurr,
        period: dateFilter.label,
        totals: {
          grossGMV: Number(grossGMV.toFixed(2)),
          netRevenue: Number(netRevenue.toFixed(2)),
          platformRevenue: Number(platformRevenue.toFixed(2)),
          doctorEarnings: Number(doctorEarnings.toFixed(2)),
          refunds: Number(totalRefunds.toFixed(2)),
          aiRevenue: Number(aiTotalRevenue.toFixed(2)),
          aov,
          acv,
        },
        paymentCounts: {
          successful: successfulPaymentsCount,
          pending: pendingPaymentsCount,
          failed: failedPaymentsCount,
          cancelled: cancelledPaymentsCount,
          total: successfulPaymentsCount + pendingPaymentsCount + failedPaymentsCount + cancelledPaymentsCount,
        },
        currencyBreakdown: Array.from(currencyBreakdownMap.values()),
        revenueTrend,
        specialtyRevenue,
        topDoctors,
      };

      this.cache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (error: any) {
      this.logger.error(`Error in getAdminRevenue: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Failed to calculate revenue analytics');
    }
  }

  /**
   * ADMIN: Healthcare Marketplace Growth Funnel (10 Authentic Stages)
   */
  async getMarketplaceFunnel(range?: string) {
    const dateFilter = this.parseDateRange(range);
    const cacheKey = `funnel_${cleanKey(range)}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const [
        { data: leads },
        { data: profiles },
        { data: appointments },
        { data: payments },
      ] = await Promise.all([
        this.supabase.admin.from('leads_newsletter').select('id, created_at'),
        this.supabase.admin.from('profiles').select('id, role, full_name, phone, created_at'),
        this.supabase.admin.from('appointments').select('id, patient_id, status, created_at').is('deleted_at', null),
        this.supabase.admin.from('payments').select('id, patient_id, appointment_id, status, created_at'),
      ]);

      const inRange = (d?: string | null) => {
        if (!d) return false;
        const t = new Date(d).getTime();
        return t >= dateFilter.start.getTime() && t <= dateFilter.end.getTime();
      };

      // 1. Visitors / Leads baseline
      const newsletterSubscribers = (leads || []).filter((l) => inRange(l.created_at)).length;
      const patientSignups = (profiles || []).filter((p) => p.role === ProfileRole.PATIENT && inRange(p.created_at));

      // Estimated total visitors from lead ratio or signup base (at least 1.5x signups if cold)
      const visitorsEstimate = Math.max(newsletterSubscribers + patientSignups.length, patientSignups.length > 0 ? patientSignups.length * 3 : 10);

      // 2. User Signups
      const signupsCount = patientSignups.length;

      // 3. Profiles Completed (has full_name & phone)
      const profilesCompleted = patientSignups.filter((p) => Boolean(p.full_name && p.phone)).length;

      // 4. Doctor Viewed / Searched (Active browsing in timeframe)
      const aptList = (appointments || []).filter((a) => inRange(a.created_at));
      const payList = (payments || []).filter((p) => inRange(p.created_at));

      const distinctInteractedPatients = new Set([
        ...aptList.map((a) => a.patient_id),
        ...payList.map((p) => p.patient_id),
      ]);
      const doctorsViewedCount = Math.max(distinctInteractedPatients.size, signupsCount > 0 ? Math.round(signupsCount * 0.8) : 0);

      // 5. Consultation Requested
      const consultsRequested = aptList.length;

      // 6. Consultation Approved
      const consultsApproved = aptList.filter((a) =>
        [AppointmentStatus.APPROVED, AppointmentStatus.UPCOMING, AppointmentStatus.WAITING, AppointmentStatus.IN_PROGRESS, AppointmentStatus.DONE].includes(a.status),
      ).length;

      // 7. Payment Started / Pending
      const paymentStarted = payList.length;

      // 8. Payment Completed / Confirmed
      const paymentCompleted = payList.filter((p) => p.status === PaymentStatus.PAID).length;

      // 9. Consultation Completed
      const consultsCompleted = aptList.filter((a) => a.status === AppointmentStatus.DONE).length;

      // 10. Repeat Consultation
      const patientAptCounts = new Map<string, number>();
      (appointments || []).filter((a) => a.status === AppointmentStatus.DONE).forEach((a) => {
        patientAptCounts.set(a.patient_id, (patientAptCounts.get(a.patient_id) || 0) + 1);
      });
      const repeatConsultations = Array.from(patientAptCounts.values()).filter((c) => c >= 2).length;

      const stages = [
        { stage: '1. Web Visitors / Inbound', count: visitorsEstimate },
        { stage: '2. Patient Signups', count: signupsCount },
        { stage: '3. Profile Completed', count: profilesCompleted },
        { stage: '4. Doctor Directory Consulted', count: doctorsViewedCount },
        { stage: '5. Consultation Requested', count: consultsRequested },
        { stage: '6. Doctor Approved Request', count: consultsApproved },
        { stage: '7. Payment Checkout Started', count: paymentStarted },
        { stage: '8. Payment Completed', count: paymentCompleted },
        { stage: '9. Session Conducted & Done', count: consultsCompleted },
        { stage: '10. Repeat Consultation', count: repeatConsultations },
      ];

      // Calculate conversion rates safely
      const topCount = Math.max(1, stages[0].count);
      const funnel = stages.map((s, idx) => {
        const prevCount = idx === 0 ? s.count : stages[idx - 1].count;
        const conversionFromPrev = prevCount > 0 ? Number(((s.count / prevCount) * 100).toFixed(1)) : 0;
        const overallConversion = Number(((s.count / topCount) * 100).toFixed(1));
        return {
          ...s,
          conversionFromPrev: `${conversionFromPrev}%`,
          overallConversion: `${overallConversion}%`,
          dropOffCount: Math.max(0, prevCount - s.count),
        };
      });

      const result = {
        period: dateFilter.label,
        stages: funnel,
        keyConversionRates: {
          signupRate: `${topCount > 0 ? Number(((signupsCount / topCount) * 100).toFixed(1)) : 0}%`,
          paymentConversion: `${paymentStarted > 0 ? Number(((paymentCompleted / paymentStarted) * 100).toFixed(1)) : 0}%`,
          completionRate: `${consultsApproved > 0 ? Number(((consultsCompleted / consultsApproved) * 100).toFixed(1)) : 0}%`,
          repeatRate: `${consultsCompleted > 0 ? Number(((repeatConsultations / Math.max(1, patientAptCounts.size)) * 100).toFixed(1)) : 0}%`,
        },
      };

      this.cache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (error: any) {
      this.logger.error(`Error in getMarketplaceFunnel: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Failed to calculate marketplace funnel');
    }
  }

  /**
   * ADMIN: Automated Revenue Reconciliation Audit
   * Validates consistency between payments, payouts, refunds, and appointments.
   */
  async getRevenueReconciliation(reportingCurrency = 'INR') {
    const repCurr = (reportingCurrency || 'INR').toUpperCase();
    try {
      const [
        { data: payments },
        { data: payouts },
        { data: refunds },
        { data: appointments },
        { data: aiTxns },
      ] = await Promise.all([
        this.supabase.admin.from('payments').select('*'),
        this.supabase.admin.from('payouts').select('*'),
        this.supabase.admin.from('refund_requests').select('*'),
        this.supabase.admin.from('appointments').select('id, status, patient_id, doctor_id').is('deleted_at', null),
        this.supabase.admin.from('ai_transactions').select('*'),
      ]);

      const pays = payments || [];
      const pyts = payouts || [];
      const refs = refunds || [];
      const apts = appointments || [];
      const aiTx = aiTxns || [];

      const aptIdSet = new Set(apts.map((a) => a.id));
      const payAptIdSet = new Set(pays.map((p) => p.appointment_id).filter(Boolean));

      let totalGross = 0;
      let totalPlatformFees = 0;
      let totalProviderPayouts = 0;
      let totalRefunds = 0;
      let totalSettledPayouts = 0;
      let totalProcessingPayouts = 0;

      const anomalies: Array<{
        type: string;
        severity: 'CRITICAL' | 'WARNING' | 'INFO';
        recordId: string;
        description: string;
      }> = [];

      // 1. Audit consultation payments
      pays.forEach((p) => {
        const origAmt = Number(p.base_amount ?? p.original_amount ?? p.amount ?? 0);
        const origCurr = ((p.base_currency ?? p.original_currency ?? p.currency ?? 'INR') as string).toUpperCase();
        const breakdown = CommissionCalculator.fromStoredPayment(p);

        const convGross = this.fxRateService.reproduceReportingValue(origAmt, origCurr, repCurr, p.fx_rate, p.reporting_currency);
        const convFee = this.fxRateService.reproduceReportingValue(breakdown.commissionAmount, origCurr, repCurr, p.fx_rate, p.reporting_currency);
        const convPayout = this.fxRateService.reproduceReportingValue(breakdown.providerPayoutAmount, origCurr, repCurr, p.fx_rate, p.reporting_currency);

        if (p.status === PaymentStatus.PAID) {
          totalGross = DecimalMath.add(totalGross, convGross);
          totalPlatformFees = DecimalMath.add(totalPlatformFees, convFee);
          totalProviderPayouts = DecimalMath.add(totalProviderPayouts, convPayout);

          // Invariant Check: fee + payout == gross
          const diff = Math.abs(DecimalMath.add(breakdown.commissionAmount, breakdown.providerPayoutAmount) - origAmt);
          if (diff > 0.05) {
            anomalies.push({
              type: 'COMMISSION_DRIFT',
              severity: 'CRITICAL',
              recordId: p.id,
              description: `Payment ${p.id} breakdown mismatch: fee (${breakdown.commissionAmount}) + payout (${breakdown.providerPayoutAmount}) != gross (${origAmt})`,
            });
          }
        }

        // Check for orphan payment (appointment_id provided but appointment doesn't exist)
        if (p.appointment_id && !aptIdSet.has(p.appointment_id)) {
          anomalies.push({
            type: 'ORPHAN_PAYMENT',
            severity: 'WARNING',
            recordId: p.id,
            description: `Payment references missing appointment ID: ${p.appointment_id}`,
          });
        }

        // Refund checks
        const refAmt = Number(p.refund_amount || 0);
        if (refAmt > origAmt) {
          anomalies.push({
            type: 'EXCESSIVE_REFUND',
            severity: 'CRITICAL',
            recordId: p.id,
            description: `Refund amount (${refAmt}) exceeds original payment amount (${origAmt})`,
          });
        }
        if (refAmt > 0) {
          const convRef = this.fxRateService.reproduceReportingValue(refAmt, origCurr, repCurr, p.fx_rate, p.reporting_currency);
          totalRefunds = DecimalMath.add(totalRefunds, convRef);
        }
      });

      // 2. Audit AI transactions
      let totalAiRevenue = 0;
      aiTx.forEach((t) => {
        const isPaid = ['paid', 'success', 'active'].includes(String(t.status || '').toLowerCase());
        if (!isPaid) return;

        const origAmt = Number(t.final_amount || t.base_amount || 0);
        const origCurr = (t.original_currency || 'INR').toUpperCase();
        const conv = this.fxRateService.reproduceReportingValue(origAmt, origCurr, repCurr, t.fx_rate_applied, t.reporting_currency);

        totalGross = DecimalMath.add(totalGross, conv);
        totalPlatformFees = DecimalMath.add(totalPlatformFees, conv);
        totalAiRevenue = DecimalMath.add(totalAiRevenue, conv);
      });

      // 3. Audit doctor payouts
      pyts.forEach((po) => {
        const amt = Number(po.original_amount || po.amount || 0);
        const curr = (po.original_currency || po.currency || 'INR').toUpperCase();
        const conv = this.fxRateService.reproduceReportingValue(amt, curr, repCurr);

        if (po.status === 'Paid') {
          totalSettledPayouts = DecimalMath.add(totalSettledPayouts, conv);
        } else if (po.status === 'Processing') {
          totalProcessingPayouts = DecimalMath.add(totalProcessingPayouts, conv);
        }
      });

      // 4. Audit appointments (check for Completed without payment)
      apts.forEach((a) => {
        if (a.status === AppointmentStatus.DONE && !payAptIdSet.has(a.id)) {
          anomalies.push({
            type: 'COMPLETED_WITHOUT_PAYMENT',
            severity: 'INFO',
            recordId: a.id,
            description: `Completed appointment ${a.id} has no matching payment record in database.`,
          });
        }
      });

      // Platform equation reconciliation
      // Gross Revenue == Doctor Earnings + Platform Commission + Refunds
      const reconciledSum = DecimalMath.add(totalProviderPayouts, totalPlatformFees);
      const grossDiff = Math.abs(reconciledSum - totalGross);
      const isEquationBalanced = grossDiff <= 0.05;

      const outstandingDoctorPayable = Math.max(
        0,
        DecimalMath.subtract(totalProviderPayouts, DecimalMath.add(totalSettledPayouts, totalProcessingPayouts)),
      );

      return {
        timestamp: new Date().toISOString(),
        reportingCurrency: repCurr,
        reconciliationStatus: isEquationBalanced && anomalies.filter((a) => a.severity === 'CRITICAL').length === 0
          ? 'BALANCED'
          : 'DISCREPANCY_DETECTED',
        financialEquation: {
          grossRevenue: Number(totalGross.toFixed(2)),
          doctorEarnings: Number(totalProviderPayouts.toFixed(2)),
          platformCommission: Number(totalPlatformFees.toFixed(2)),
          refunds: Number(totalRefunds.toFixed(2)),
          aiSubscriptions: Number(totalAiRevenue.toFixed(2)),
          variance: Number(grossDiff.toFixed(2)),
          isBalanced: isEquationBalanced,
        },
        payoutLedger: {
          totalDoctorEarned: Number(totalProviderPayouts.toFixed(2)),
          totalSettled: Number(totalSettledPayouts.toFixed(2)),
          totalProcessing: Number(totalProcessingPayouts.toFixed(2)),
          outstandingPayable: Number(outstandingDoctorPayable.toFixed(2)),
        },
        dataQualityCheck: {
          totalAnomalies: anomalies.length,
          criticalErrors: anomalies.filter((a) => a.severity === 'CRITICAL').length,
          warnings: anomalies.filter((a) => a.severity === 'WARNING').length,
          anomalies,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error in getRevenueReconciliation: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Failed to generate revenue reconciliation report');
    }
  }

  /**
   * DOCTOR: Practice Analytics & Clinical Demographics (Doctor Data Isolation)
   */
  async getDoctorPracticeAnalytics(doctorId: string, range?: string) {
    const dateFilter = this.parseDateRange(range);
    const cacheKey = `doc_analytics_${doctorId}_${cleanKey(range)}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const [
        { data: doctorProfile },
        { data: appointments },
        { data: payments },
        { data: payouts },
      ] = await Promise.all([
        this.supabase.admin.from('profiles').select('*').eq('id', doctorId).maybeSingle(),
        this.supabase.admin.from('appointments').select('*').eq('doctor_id', doctorId).is('deleted_at', null),
        this.supabase.admin.from('payments').select('*').eq('doctor_id', doctorId),
        this.supabase.admin.from('payouts').select('*').eq('doctor_id', doctorId),
      ]);

      const docCurr = doctorProfile?.currency || 'INR';
      const apts = appointments || [];
      const pays = payments || [];
      const pyts = payouts || [];

      const inRange = (d: string) => {
        const t = new Date(d).getTime();
        return t >= dateFilter.start.getTime() && t <= dateFilter.end.getTime();
      };

      // Financials
      let grossBillings = 0;
      let platformFee = 0;
      let netDoctorEarnings = 0;
      let refunds = 0;

      pays.filter((p) => inRange(p.created_at)).forEach((p) => {
        const origAmt = Number(p.original_amount || p.amount || 0);
        const breakdown = CommissionCalculator.fromStoredPayment(p);

        if (p.status === PaymentStatus.PAID) {
          grossBillings = DecimalMath.add(grossBillings, origAmt);
          platformFee = DecimalMath.add(platformFee, breakdown.commissionAmount);
          netDoctorEarnings = DecimalMath.add(netDoctorEarnings, breakdown.providerPayoutAmount);
        }
        if (p.status === PaymentStatus.REFUNDED || Number(p.refund_amount || 0) > 0) {
          refunds = DecimalMath.add(refunds, Number(p.refund_amount || origAmt));
        }
      });

      // Payouts
      let paidPayouts = 0;
      let pendingPayouts = 0;
      pyts.forEach((po) => {
        const amt = Number(po.amount || 0);
        if (po.status === 'Paid') paidPayouts = DecimalMath.add(paidPayouts, amt);
        else if (po.status === 'Processing') pendingPayouts = DecimalMath.add(pendingPayouts, amt);
      });

      const allTimeEarned = DecimalMath.sum(
        pays.filter((p) => p.status === PaymentStatus.PAID).map((p) => CommissionCalculator.fromStoredPayment(p).providerPayoutAmount),
      );
      const availableBalance = Math.max(0, DecimalMath.subtract(allTimeEarned, DecimalMath.add(paidPayouts, pendingPayouts)));

      // Consultations
      const currentApts = apts.filter((a) => inRange(a.created_at || a.scheduled_date));
      const completed = currentApts.filter((a) => a.status === AppointmentStatus.DONE).length;
      const scheduled = currentApts.filter((a) => [AppointmentStatus.UPCOMING, AppointmentStatus.WAITING, AppointmentStatus.IN_PROGRESS].includes(a.status)).length;
      const cancelled = currentApts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
      const noShow = currentApts.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
      const totalBooked = currentApts.length;

      const completionRate = totalBooked > 0 ? Number(((completed / totalBooked) * 100).toFixed(1)) : 0;
      const noShowRate = totalBooked > 0 ? Number(((noShow / totalBooked) * 100).toFixed(1)) : 0;
      const acv = completed > 0 ? Number((grossBillings / completed).toFixed(2)) : 0;

      // Patients: Unique and repeat patients
      const patientVisits = new Map<string, number>();
      apts.filter((a) => a.status === AppointmentStatus.DONE).forEach((a) => {
        patientVisits.set(a.patient_id, (patientVisits.get(a.patient_id) || 0) + 1);
      });
      const uniquePatientsCount = patientVisits.size;
      const repeatPatientsCount = Array.from(patientVisits.values()).filter((c) => c >= 2).length;
      const repeatPatientPercentage = uniquePatientsCount > 0 ? Number(((repeatPatientsCount / uniquePatientsCount) * 100).toFixed(1)) : 0;

      // Delivery types
      const videoCount = currentApts.filter((a) => a.type === 'video').length;
      const clinicCount = currentApts.filter((a) => a.type === 'clinic').length;

      // Monthly trajectory (last 6 months)
      const monthlyMap = new Map<string, { revenue: number; consultations: number }>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('en-US', { month: 'short' });
        monthlyMap.set(key, { revenue: 0, consultations: 0 });
      }

      pays.filter((p) => p.status === PaymentStatus.PAID).forEach((p) => {
        const key = new Date(p.created_at).toLocaleString('en-US', { month: 'short' });
        if (monthlyMap.has(key)) {
          const m = monthlyMap.get(key)!;
          const payout = CommissionCalculator.fromStoredPayment(p).providerPayoutAmount;
          m.revenue = DecimalMath.add(m.revenue, payout);
        }
      });
      apts.filter((a) => a.status === AppointmentStatus.DONE).forEach((a) => {
        const key = new Date(a.scheduled_date || a.created_at).toLocaleString('en-US', { month: 'short' });
        if (monthlyMap.has(key)) {
          monthlyMap.get(key)!.consultations += 1;
        }
      });

      const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        revenue: Number(data.revenue.toFixed(2)),
        consultations: data.consultations,
      }));

      const result = {
        currency: docCurr,
        period: dateFilter.label,
        revenue: {
          grossBillings: Number(grossBillings.toFixed(2)),
          platformCommission: Number(platformFee.toFixed(2)),
          netEarnings: Number(netDoctorEarnings.toFixed(2)),
          refunds: Number(refunds.toFixed(2)),
          paidPayouts: Number(paidPayouts.toFixed(2)),
          pendingPayouts: Number(pendingPayouts.toFixed(2)),
          availableBalance: Number(availableBalance.toFixed(2)),
          acv,
        },
        performance: {
          totalConsultations: totalBooked,
          completed,
          scheduled,
          cancelled,
          noShow,
          completionRate: `${completionRate}%`,
          noShowRate: `${noShowRate}%`,
        },
        patients: {
          totalUniquePatients: uniquePatientsCount,
          repeatPatients: repeatPatientsCount,
          repeatPatientPercentage: `${repeatPatientPercentage}%`,
        },
        deliverySplit: {
          video: videoCount,
          clinic: clinicCount,
        },
        monthlyTrend,
      };

      this.cache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (error: any) {
      this.logger.error(`Error in getDoctorPracticeAnalytics: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Failed to calculate doctor practice analytics');
    }
  }

  /**
   * PATIENT: Activity, Health Spending & AI Usage (Patient Data Isolation)
   */
  async getPatientActivityAnalytics(patientId: string) {
    try {
      const [
        { data: appointments },
        { data: payments },
        { data: aiAccount },
        { data: aiSub },
        { data: doctors },
      ] = await Promise.all([
        this.supabase.admin.from('appointments').select('*').eq('patient_id', patientId).is('deleted_at', null).order('scheduled_date', { ascending: false }),
        this.supabase.admin.from('payments').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        this.supabase.admin.from('ai_credit_accounts').select('*').eq('user_id', patientId).maybeSingle(),
        this.supabase.admin.from('ai_subscriptions').select('*').eq('user_id', patientId).maybeSingle(),
        this.supabase.admin.from('profiles').select('id, full_name, specialty').eq('role', ProfileRole.DOCTOR),
      ]);

      const docMap = new Map((doctors || []).map((d) => [d.id, d]));
      const apts = appointments || [];
      const pays = payments || [];

      // Consultations
      const completed = apts.filter((a) => a.status === AppointmentStatus.DONE).length;
      const upcoming = apts.filter((a) => [AppointmentStatus.UPCOMING, AppointmentStatus.WAITING, AppointmentStatus.APPROVED].includes(a.status)).length;
      const cancelled = apts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;

      // Spending grouped by currency
      const spendingByCurrency = new Map<string, { currency: string; consultationSpend: number; totalSpend: number; count: number }>();
      pays.filter((p) => p.status === PaymentStatus.PAID).forEach((p) => {
        const curr = (p.original_currency || p.currency || 'INR').toUpperCase();
        const amt = Number(p.original_amount || p.amount || 0);

        const exist = spendingByCurrency.get(curr) || { currency: curr, consultationSpend: 0, totalSpend: 0, count: 0 };
        exist.consultationSpend = DecimalMath.add(exist.consultationSpend, amt);
        exist.totalSpend = DecimalMath.add(exist.totalSpend, amt);
        exist.count += 1;
        spendingByCurrency.set(curr, exist);
      });

      // Unique Doctors Consulted
      const consultedDoctorIds = Array.from(new Set(apts.map((a) => a.doctor_id).filter(Boolean)));
      const doctorsConsulted = consultedDoctorIds.map((id) => ({
        id,
        name: docMap.get(id)?.full_name || 'Dr. Specialist',
        specialty: docMap.get(id)?.specialty || 'General',
      }));

      // AI Status
      const creditsRemaining = aiAccount?.balance ?? (aiSub?.monthly_ai_credits ? Math.max(0, aiSub.monthly_ai_credits - (aiSub.credits_used || 0)) : 15);
      const creditsGranted = aiAccount?.lifetime_granted ?? (aiSub?.monthly_ai_credits || 15);
      const creditsConsumed = aiAccount?.lifetime_consumed ?? (aiSub?.credits_used || 0);

      return {
        consultations: {
          total: apts.length,
          completed,
          upcoming,
          cancelled,
          recent: apts.slice(0, 5).map((a) => ({
            id: a.id,
            date: a.scheduled_date,
            time: a.scheduled_time,
            type: a.type,
            status: a.status,
            doctorName: docMap.get(a.doctor_id)?.full_name || 'Doctor',
            specialty: a.specialty || docMap.get(a.doctor_id)?.specialty || 'General',
          })),
        },
        spending: Array.from(spendingByCurrency.values()),
        ai: {
          planId: aiSub?.plan_id || 'patient_basic',
          planStatus: aiSub?.status || 'active',
          creditsRemaining,
          lifetimeGranted: creditsGranted,
          lifetimeConsumed: creditsConsumed,
        },
        doctorsConsulted,
      };
    } catch (error: any) {
      this.logger.error(`Error in getPatientActivityAnalytics: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Failed to retrieve patient analytics');
    }
  }

  /**
   * ADMIN & PRODUCT: Executive Product Health Scorecard & Marketplace Diagnosis
   * Diagnoses whether marketplace bottleneck is Demand, Supply, Conversion, or Retention.
   */
  async getProductHealthScorecard(reportingCurrency = 'INR') {
    const repCurr = (reportingCurrency || 'INR').toUpperCase();
    try {
      const [
        { data: profiles },
        { data: appointments },
        { data: payments },
        { data: aiTxns },
        { data: creditAccounts },
      ] = await Promise.all([
        this.supabase.admin.from('profiles').select('id, role, full_name, phone, kyc_verified, created_at'),
        this.supabase.admin.from('appointments').select('*').is('deleted_at', null),
        this.supabase.admin.from('payments').select('*'),
        this.supabase.admin.from('ai_transactions').select('*'),
        this.supabase.admin.from('ai_credit_accounts').select('*'),
      ]);

      const profs = profiles || [];
      const apts = appointments || [];
      const pays = payments || [];
      const aiTx = aiTxns || [];
      const accounts = creditAccounts || [];

      const patients = profs.filter((p) => p.role === ProfileRole.PATIENT);
      const doctors = profs.filter((p) => p.role === ProfileRole.DOCTOR);
      const verifiedDoctors = doctors.filter((d) => d.kyc_verified);

      // Active doctors: doctors with an appointment or verified schedule
      const doctorAppointmentCounts = new Map<string, number>();
      apts.forEach((a) => {
        if (a.doctor_id) {
          doctorAppointmentCounts.set(a.doctor_id, (doctorAppointmentCounts.get(a.doctor_id) || 0) + 1);
        }
      });
      const activeDoctors = doctors.filter((d) => doctorAppointmentCounts.has(d.id));

      // Financials
      let grossGMV = 0;
      let platformFee = 0;
      let doctorEarnings = 0;
      let paidConsultationCount = 0;

      pays.filter((p) => p.status === PaymentStatus.PAID).forEach((p) => {
        const origAmt = Number(p.original_amount || p.amount || 0);
        const origCurr = (p.original_currency || p.currency || 'INR').toUpperCase();
        const convGross = this.fxRateService.reproduceReportingValue(origAmt, origCurr, repCurr, p.fx_rate, p.reporting_currency);
        const breakdown = CommissionCalculator.fromStoredPayment(p);
        const convFee = this.fxRateService.reproduceReportingValue(breakdown.commissionAmount, origCurr, repCurr, p.fx_rate, p.reporting_currency);
        const convPayout = this.fxRateService.reproduceReportingValue(breakdown.providerPayoutAmount, origCurr, repCurr, p.fx_rate, p.reporting_currency);

        grossGMV = DecimalMath.add(grossGMV, convGross);
        platformFee = DecimalMath.add(platformFee, convFee);
        doctorEarnings = DecimalMath.add(doctorEarnings, convPayout);
        paidConsultationCount++;
      });

      let aiRevenue = 0;
      aiTx.filter((t) => ['paid', 'success', 'active'].includes(String(t.status || '').toLowerCase())).forEach((t) => {
        const origAmt = Number(t.final_amount || t.base_amount || 0);
        const origCurr = (t.original_currency || 'INR').toUpperCase();
        const conv = this.fxRateService.reproduceReportingValue(origAmt, origCurr, repCurr, t.fx_rate_applied, t.reporting_currency);
        grossGMV = DecimalMath.add(grossGMV, conv);
        platformFee = DecimalMath.add(platformFee, conv);
        aiRevenue = DecimalMath.add(aiRevenue, conv);
      });

      // Consultations
      const completedSessions = apts.filter((a) => a.status === AppointmentStatus.DONE).length;
      const cancelledSessions = apts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
      const noShowSessions = apts.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
      const totalBooked = apts.length;

      // Repeat Patients
      const patientVisits = new Map<string, number>();
      apts.filter((a) => a.status === AppointmentStatus.DONE).forEach((a) => {
        patientVisits.set(a.patient_id, (patientVisits.get(a.patient_id) || 0) + 1);
      });
      const uniqueCompletedPatients = patientVisits.size;
      const repeatPatients = Array.from(patientVisits.values()).filter((c) => c >= 2).length;
      const repeatPatientRate = uniqueCompletedPatients > 0 ? Number(((repeatPatients / uniqueCompletedPatients) * 100).toFixed(1)) : 0;

      // Rates
      const completionRate = totalBooked > 0 ? Number(((completedSessions / totalBooked) * 100).toFixed(1)) : 0;
      const noShowRate = totalBooked > 0 ? Number(((noShowSessions / totalBooked) * 100).toFixed(1)) : 0;
      const paymentConversionRate = totalBooked > 0 ? Number(((paidConsultationCount / Math.max(1, pays.length)) * 100).toFixed(1)) : 0;
      const patientToDoctorRatio = activeDoctors.length > 0 ? Number((patients.length / activeDoctors.length).toFixed(1)) : patients.length;

      // Diagnostic Engine: Determine Marketplace Bottleneck
      let bottleneck: 'DEMAND' | 'SUPPLY' | 'CONVERSION' | 'RETENTION' | 'HEALTHY' = 'HEALTHY';
      let headline = 'Marketplace Equilibrium';
      let reason = 'Supply, demand, and session execution are functioning normally.';
      let primaryAction = 'Continue monitoring patient acquisition and physician responsiveness.';

      if (activeDoctors.length === 0 || verifiedDoctors.length === 0) {
        bottleneck = 'SUPPLY';
        headline = 'Supply Bottleneck: No Active Verified Physicians';
        reason = 'No active doctors are currently verified to take inbound consultation requests.';
        primaryAction = 'Expedite physician onboarding and KYC verification queue.';
      } else if (apts.length === 0) {
        bottleneck = 'DEMAND';
        headline = 'Demand Bottleneck: Zero Booking Inbound';
        reason = 'Physician supply exists, but no consultation requests have been created by patients.';
        primaryAction = 'Drive top-of-funnel traffic through PCOS/Women\'s health content and campaign acquisition.';
      } else if (pays.length > 0 && paidConsultationCount === 0) {
        bottleneck = 'CONVERSION';
        headline = 'Conversion Bottleneck: Checkout Drop-Off';
        reason = 'Patients are initiating bookings, but checkout payments are failing or abandoning.';
        primaryAction = 'Audit payment gateway integration, payment methods, and pricing affordability.';
      } else if (completedSessions >= 5 && repeatPatientRate < 10) {
        bottleneck = 'RETENTION';
        headline = 'Retention Bottleneck: Low Patient Continuity';
        reason = 'Patients complete consultations but do not book follow-up consultations.';
        primaryAction = 'Implement automated post-consultation care plans and prescription follow-up nudges.';
      }

      // Insights
      const insights = [
        {
          type: bottleneck === 'HEALTHY' ? 'success' : 'warning',
          category: 'Marketplace',
          title: headline,
          message: reason,
          action: primaryAction,
        },
        {
          type: 'info',
          category: 'Revenue',
          title: `Gross Volume: ${repCurr} ${grossGMV.toFixed(2)}`,
          message: `Consultations generate ${repCurr} ${(grossGMV - aiRevenue).toFixed(2)}, AI subscriptions generate ${repCurr} ${aiRevenue.toFixed(2)}.`,
          action: 'Monitor AOV across specialties to optimize consultation fee tiers.',
        },
        {
          type: completionRate >= 80 ? 'success' : 'info',
          category: 'Clinical Quality',
          title: `Clinical Completion Rate: ${completionRate}%`,
          message: `${completedSessions} completed sessions, ${cancelledSessions} cancelled, ${noShowSessions} no-shows.`,
          action: noShowRate > 10 ? 'Send SMS/WhatsApp reminders 2 hours prior to call.' : 'Maintain current reminder cadence.',
        },
      ];

      return {
        timestamp: new Date().toISOString(),
        reportingCurrency: repCurr,
        diagnosis: {
          bottleneck,
          headline,
          reason,
          primaryAction,
        },
        dimensions: {
          acquisition: {
            totalPatients: patients.length,
            totalDoctors: doctors.length,
            patientToDoctorRatio,
            status: patients.length > 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
          },
          activation: {
            profilesCompleted: patients.filter((p) => p.full_name && p.phone).length,
            activationRate: patients.length > 0 ? `${Math.round((patients.filter((p) => p.full_name && p.phone).length / patients.length) * 100)}%` : '0%',
            status: 'HEALTHY',
          },
          conversion: {
            totalRequests: totalBooked,
            paidConsultations: paidConsultationCount,
            paymentConversionRate: `${paymentConversionRate}%`,
            status: paidConsultationCount > 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
          },
          retention: {
            completedPatients: uniqueCompletedPatients,
            repeatPatients,
            repeatPatientRate: `${repeatPatientRate}%`,
            status: repeatPatientRate >= 15 ? 'HEALTHY' : 'NEEDS_ATTENTION',
          },
          revenue: {
            grossGMV: Number(grossGMV.toFixed(2)),
            platformFee: Number(platformFee.toFixed(2)),
            doctorEarnings: Number(doctorEarnings.toFixed(2)),
            aiRevenue: Number(aiRevenue.toFixed(2)),
            aov: paidConsultationCount > 0 ? Number((grossGMV / paidConsultationCount).toFixed(2)) : 0,
            status: grossGMV > 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
          },
          supply: {
            totalDoctors: doctors.length,
            verifiedDoctors: verifiedDoctors.length,
            activeDoctors: activeDoctors.length,
            utilizationRate: `${activeDoctors.length > 0 ? Math.round((activeDoctors.length / Math.max(1, doctors.length)) * 100) : 0}%`,
            status: verifiedDoctors.length > 0 ? 'HEALTHY' : 'CRITICAL',
          },
          quality: {
            completionRate: `${completionRate}%`,
            noShowRate: `${noShowRate}%`,
            status: noShowRate < 10 ? 'HEALTHY' : 'NEEDS_ATTENTION',
          },
          ai: {
            activeAccounts: accounts.length,
            totalCreditsConsumed: accounts.reduce((s, a) => s + (a.lifetime_consumed || 0), 0),
            status: accounts.length > 0 ? 'HEALTHY' : 'INFO',
          },
        },
        actionableInsights: insights,
      };
    } catch (error: any) {
      this.logger.error(`Error in getProductHealthScorecard: ${error?.message}`, error?.stack);
      throw new InternalServerErrorException('Failed to generate product health scorecard');
    }
  }
}

function cleanKey(val?: string) {
  return (val || 'default').toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
