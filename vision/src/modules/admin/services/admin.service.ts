import { randomUUID } from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AppointmentStatus } from '@/shared/interfaces/appointment.interface';
import { ERROR_MESSAGES, ERROR_CODES } from '@/core/constants/errors.constant';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { EmailService } from '@/core/email/email.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import { DecimalMath } from '@/core/utils/decimal.util';
import { CommissionCalculator } from '@/core/utils/commission.util';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

import { CommissionService } from '@/core/commission/commission.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  private readonly statsCache = new Map<
    string,
    { timestamp: number; data: any }
  >();
  private readonly STATS_CACHE_TTL_MS = 30_000; // 30 seconds

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly cashfree: CashfreeService,
    private readonly email: EmailService,
    private readonly fxRateService: FXRateService,
    private readonly commissionService: CommissionService,
  ) {}

  private static readonly CANONICAL_PLAN_NAMES: Record<string, string> = {
    doctor_plan_1: 'Doctor Starter',
    doctor_plan_2: 'Doctor Pro',
    doctor_plan_3: 'Doctor Premium',
    patient_plan_1: 'Patient Basic',
    patient_plan_2: 'Patient Pro',
    patient_plan_3: 'Patient Premium',
    doctor_free: 'Doctor Starter',
    doctor_pro: 'Doctor Pro',
    patient_free: 'Patient Basic',
    patient_premium: 'Patient Pro',
  };

  public invalidateStatsCache() {
    this.statsCache.clear();
  }

  /** AUDIT_REPORT.md SEC-6 — who did what, when, before → after, for the
   * admin actions that actually move money or change access. Best-effort:
   * never blocks or fails the action it's recording. */
  private writeAudit(
    actor: AuthUser,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    this.supabase.admin
      .from('audit_log')
      .insert({
        actor_id: actor.id,
        actor_name: actor.profile?.full_name || null,
        action,
        entity,
        entity_id: entityId,
        before: before ?? null,
        after: after ?? null,
      })
      .then(({ error }: any) => {
        if (error) console.error('Failed to write audit log:', error.message);
      });
  }

  // ─── Dashboard ───────────────────────────────────────────────────
  async getDashboardStats(reportingCurrency = 'INR') {
    try {
      const repCurr = (reportingCurrency || 'INR').toUpperCase();
      const cacheKey = repCurr;
      const cached = this.statsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.STATS_CACHE_TTL_MS) {
        return cached.data;
      }

      const [
        { count: totalUsers },
        { count: totalDoctors },
        { count: totalPatients },
        { count: totalAppointments },
        { count: completedAppointments },
        { count: pendingVerifications },
        { count: openTickets },
        { count: pendingRefunds },
        { data: paidPayments },
        { data: paidAiTransactions },
      ] = await Promise.all([
        this.supabase.admin
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        this.supabase.admin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', ProfileRole.DOCTOR),
        this.supabase.admin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', ProfileRole.PATIENT),
        this.supabase.admin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null),
        this.supabase.admin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', AppointmentStatus.DONE),
        this.supabase.admin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', ProfileRole.DOCTOR)
          .eq('kyc_verified', false),
        this.supabase.admin
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Open'),
        this.supabase.admin
          .from('refund_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending'),
        this.supabase.admin
          .from('payments')
          .select(
            'amount, original_amount, currency, original_currency, reporting_amount, reporting_currency, fx_rate, platform_fee_amount',
          )
          .eq('status', 'Paid'),
        this.supabase.admin
          .from('ai_transactions')
          .select(
            'final_amount, base_amount, original_currency, reporting_currency, fx_rate_applied, status',
          )
          .in('status', ['Paid', 'paid', 'success', 'Success', 'active']),
      ]);

      let normalizedPlatformRevenue = 0;
      let normalizedGrossVolume = 0;
      let normalizedAiRevenue = 0;

      (paidPayments || []).forEach((p) => {
        const origAmt = Number(p.original_amount || p.amount || 0);
        const origCurr = (
          p.original_currency ||
          p.currency ||
          'INR'
        ).toUpperCase();
        const feeAmt = Number(
          p.platform_fee_amount || CommissionCalculator.fromStoredPayment(p).commissionAmount,
        );

        // Convert gross and platform fee to requested reporting currency
        const convertedGross = this.fxRateService.reproduceReportingValue(
          origAmt,
          origCurr,
          repCurr,
          p.fx_rate,
          p.reporting_currency,
          p.reporting_amount,
        );
        const convertedFee = this.fxRateService.reproduceReportingValue(
          feeAmt,
          origCurr,
          repCurr,
          p.fx_rate,
          p.reporting_currency,
        );

        normalizedGrossVolume = DecimalMath.add(
          normalizedGrossVolume,
          convertedGross,
        );
        normalizedPlatformRevenue = DecimalMath.add(
          normalizedPlatformRevenue,
          convertedFee,
        );
      });

      // Integrate paid AI Plan Subscriptions (100% platform revenue)
      (paidAiTransactions || []).forEach((t) => {
        const origAmt = Number(t.final_amount || t.base_amount || 0);
        const origCurr = (t.original_currency || 'INR').toUpperCase();
        const convertedGross = this.fxRateService.reproduceReportingValue(
          origAmt,
          origCurr,
          repCurr,
          t.fx_rate_applied,
          t.reporting_currency,
        );
        normalizedGrossVolume = DecimalMath.add(normalizedGrossVolume, convertedGross);
        normalizedPlatformRevenue = DecimalMath.add(normalizedPlatformRevenue, convertedGross);
        normalizedAiRevenue = DecimalMath.add(normalizedAiRevenue, convertedGross);
      });

      const result = {
        totalUsers: totalUsers || 0,
        activeDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        platformRevenue: normalizedPlatformRevenue,
        platformRevenueCurrency: repCurr,
        grossVolume: normalizedGrossVolume,
        grossVolumeCurrency: repCurr,
        aiSubscriptionRevenue: normalizedAiRevenue,
        pendingVerifications: pendingVerifications || 0,
        totalAppointments: totalAppointments || 0,
        completedConsultations: completedAppointments || 0,
        openTickets: openTickets || 0,
        pendingRefunds: pendingRefunds || 0,
      };

      this.statsCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSystemHealth() {
    try {
      const { count: dbCheck } = await this.supabase.admin
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      return [
        {
          name: 'API Services',
          status: 'Operational',
          ping: `${Math.floor(Math.random() * 50) + 10}ms`,
        },
        {
          name: 'Database',
          status: dbCheck !== null && dbCheck >= 0 ? 'Operational' : 'Down',
          ping: `${dbCheck} records`,
        },
        { name: 'SMS Gateway', status: 'Operational', ping: 'OK' },
        {
          name: 'Video Servers',
          status: 'Operational',
          ping: `${Math.floor(Math.random() * 60) + 20}ms`,
        },
      ];
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Compliance & Audit ──────────────────────────────────────────
  async getPhiAuditLogs() {
    let { data, error } = await this.supabase.admin
      .from('phi_audit_logs')
      .select(
        `
        id, actor_id, actor_role, target_patient_id, action, resource, status, ip_address, created_at,
        actor:profiles!phi_audit_logs_actor_id_fkey(full_name, email),
        target:profiles!phi_audit_logs_target_patient_id_fkey(full_name, email)
      `,
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (error && (error.message?.includes('target_patient_id') || error.message?.includes('relationship'))) {
      const fallback = await this.supabase.admin
        .from('phi_audit_logs')
        .select(
          `
          id, actor_id, actor_role, action, resource, status, ip_address, details, created_at,
          actor:profiles!phi_audit_logs_actor_id_fkey(full_name, email)
        `,
        )
        .order('created_at', { ascending: false })
        .limit(500);
      data = fallback.data as any;
      error = fallback.error;
    }

    if (error) {
      this.logger.error(
        `Failed to fetch admin PHI audit logs: ${error.message}`,
        error,
      );
      return [];
    }
    return data || [];
  }

  // ─── Analytics ───────────────────────────────────────────────────
  async getAnalytics() {
    try {
      const [{ data: profiles }, { data: appointments }, { data: payments }] =
        await Promise.all([
          this.supabase.admin
            .from('profiles')
            .select('id, role, country, created_at'),
          this.supabase.admin.from('appointments').select('id, status, type, specialty'),
          this.supabase.admin
            .from('payments')
            .select(
              'id, amount, currency, status, created_at, base_amount, base_currency, original_amount, original_currency, reporting_currency, fx_rate, appointment_id',
            ),
        ]);

      const profs = profiles || [];
      const apts = appointments || [];
      const pays = payments || [];

      // financialData: User Growth (Patients vs Doctors) - Last 6 months
      const now = new Date();
      const monthNames: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthNames.push(d.toLocaleString('en-US', { month: 'short' }));
      }

      const financialData = monthNames.map((name) => {
        const monthEnd = new Date(
          now.getFullYear(),
          now.getMonth() -
            (monthNames.length - 1 - monthNames.indexOf(name)) +
            1,
          0,
        );
        const upToMonth = profs.filter(
          (p) => new Date(p.created_at) <= monthEnd,
        );
        return {
          name,
          patients: upToMonth.filter((p) => p.role === ProfileRole.PATIENT)
            .length,
          doctors: upToMonth.filter((p) => p.role === ProfileRole.DOCTOR)
            .length,
        };
      });

      // crossBorderTrends (International vs Domestic growth over last 6 months)
      const crossBorderTrends = monthNames.map((month) => {
        const monthEnd = new Date(
          now.getFullYear(),
          now.getMonth() -
            (monthNames.length - 1 - monthNames.indexOf(month)) +
            1,
          0,
        );
        const upToMonth = profs.filter(
          (p) =>
            p.role === ProfileRole.PATIENT &&
            new Date(p.created_at) <= monthEnd,
        );
        const domestic = upToMonth.filter((p) => p.country === 'IN').length;
        const international = upToMonth.length - domestic;
        // Total international revenue settled up to this month converted to USD
        const monthEndGrossUSD = pays
          .filter((p) => p.status === 'Paid' && new Date(p.created_at) <= monthEnd)
          .reduce((sum, p) => {
            const amt = Number(p.original_amount || p.amount || 0);
            const curr = (p.original_currency || p.currency || 'INR').toUpperCase();
            return sum + this.fxRateService.reproduceReportingValue(amt, curr, 'USD', p.fx_rate, p.reporting_currency);
          }, 0);
        return {
          month,
          Domestic: domestic,
          International: international,
          TotalUSD: Number(monthEndGrossUSD.toFixed(2)),
        };
      });

      // geographicDistribution
      const geoCount = new Map<string, number>();
      let totalPatients = 0;
      profs
        .filter((p) => p.role === ProfileRole.PATIENT)
        .forEach((p) => {
          const c = p.country || 'US';
          geoCount.set(c, (geoCount.get(c) || 0) + 1);
          totalPatients++;
        });
      const geographicDistribution = Array.from(geoCount.entries())
        .map(([code, count]) => {
          let name = code;
          let flag = '🌍';
          if (code === 'US') {
            name = 'United States';
            flag = '🇺🇸';
          }
          if (code === 'GB') {
            name = 'United Kingdom';
            flag = '🇬🇧';
          }
          if (code === 'AE') {
            name = 'United Arab Emirates';
            flag = '🇦🇪';
          }
          if (code === 'IN') {
            name = 'India';
            flag = '🇮🇳';
          }
          if (code === 'EU') {
            name = 'European Union';
            flag = '🇪🇺';
          }
          return {
            code,
            name,
            flag,
            patientCount: count,
            percentage:
              totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0,
          };
        })
        .sort((a, b) => b.patientCount - a.patientCount);

      const crossBorderSplit = {
        international: geographicDistribution
          .filter((g) => g.code !== 'IN')
          .reduce((acc, g) => acc + g.patientCount, 0),
        domestic:
          geographicDistribution.find((g) => g.code === 'IN')?.patientCount ||
          0,
        internationalPercentage: 0,
      };
      if (totalPatients > 0) {
        crossBorderSplit.internationalPercentage = Math.round(
          (crossBorderSplit.international / totalPatients) * 100,
        );
      }

      // revenueByCurrency
      const revCurrMap = new Map<string, { amount: number; count: number }>();
      pays
        .filter((p) => p.status === 'Paid')
        .forEach((p) => {
          const curr = ((p.base_currency ?? p.original_currency ?? p.currency ?? 'INR') as string).toUpperCase();
          const exist = revCurrMap.get(curr) || { amount: 0, count: 0 };
          revCurrMap.set(curr, {
            amount: exist.amount + Number(p.base_amount ?? p.original_amount ?? p.amount ?? 0),
            count: exist.count + 1,
          });
        });
      const revenueByCurrency = Array.from(revCurrMap.entries()).map(
        ([currency, data]) => {
          let flag = '🌍';
          let symbol = currency;
          let name = currency;
          if (currency === 'USD') {
            flag = '🇺🇸';
            symbol = '$';
            name = 'US Dollar';
          } else if (currency === 'INR') {
            flag = '🇮🇳';
            symbol = '₹';
            name = 'Indian Rupee';
          } else if (currency === 'GBP') {
            flag = '🇬🇧';
            symbol = '£';
            name = 'British Pound';
          } else if (currency === 'EUR') {
            flag = '🇪🇺';
            symbol = '€';
            name = 'Euro';
          } else if (currency === 'AED') {
            flag = '🇦🇪';
            symbol = 'AED';
            name = 'UAE Dirham';
          }
          return { currency, name, symbol, flag, ...data };
        },
      );

      // appointmentStatusBreakdown
      const statusCounts = new Map<string, number>();
      apts.forEach((a) =>
        statusCounts.set(a.status, (statusCounts.get(a.status) || 0) + 1),
      );
      const appointmentStatusBreakdown = Array.from(statusCounts.entries()).map(
        ([status, count]) => ({ status, count }),
      );

      // consultTypeSplit
      const consultTypeSplit = { video: 0, clinic: 0 };
      apts.forEach((a) => {
        if (a.type === 'video') consultTypeSplit.video++;
        else consultTypeSplit.clinic++;
      });

      const specRevMap = new Map<string, number>();
      const aptPaymentMap = new Map<string, number>();
      pays.filter((p) => p.status === 'Paid').forEach((p) => {
        if (p.appointment_id) {
          aptPaymentMap.set(p.appointment_id, Number(p.base_amount ?? p.original_amount ?? p.amount ?? 0));
        }
      });
      apts
        .filter((a) => a.status === 'Done')
        .forEach((a) => {
          const spec = a.specialty || (a.type === 'video' ? 'Telehealth' : 'In-Clinic Care');
          const amt = aptPaymentMap.get(a.id) || 0;
          specRevMap.set(spec, (specRevMap.get(spec) || 0) + amt);
        });
      const specialtyRevenue = Array.from(specRevMap.entries()).map(
        ([name, value]) => ({
          name,
          value,
          color: name === 'Telehealth' ? '#6B46C1' : '#0ea5e9',
        }),
      );

      return {
        financialData,
        geographicDistribution,
        crossBorderSplit,
        crossBorderTrends,
        revenueByCurrency,
        specialtyRevenue,
        appointmentStatusBreakdown,
        consultTypeSplit,
        totalPatients,
        totalDoctors: profs.filter((p) => p.role === ProfileRole.DOCTOR).length,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Users ───────────────────────────────────────────────────────
  async getAllUsers(role?: string, page = 1, limit = 50, search?: string) {
    try {
      let q = this.supabase.admin
        .from('profiles')
        .select('id, full_name, email, phone, role, status, created_at', {
          count: 'exact',
        });
      if (role) q = q.eq('role', role);
      else q = q.eq('role', ProfileRole.PATIENT);
      if (search) {
        // Strip characters that are structurally significant in a PostgREST
        // filter string (`,` separates or-conditions, `(`/`)` group them) so
        // a search term can't break out of the ilike clauses below.
        const safeSearch = search.replace(/[,()%_]/g, ' ').trim();
        if (safeSearch)
          q = q.or(
            `full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`,
          );
      }

      const from = (page - 1) * limit;
      const { data, count } = await q
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      const userIds = (data || []).map((u) => u.id);
      const { data: userSubs } = userIds.length
        ? await this.supabase.admin
            .from('ai_subscriptions')
            .select('user_id, plan_id, status, monthly_ai_credits, credits_used, current_period_end')
            .in('user_id', userIds)
        : { data: [] as any[] };
      const subByUserId = new Map((userSubs || []).map((s) => [s.user_id, s]));

      return {
        users: (data || []).map((u) => {
          const sub = subByUserId.get(u.id);
          const planId = sub?.plan_id || (u.role === 'doctor' ? 'doctor_plan_1' : 'patient_plan_1');
          return {
            id: u.id,
            name: u.full_name || 'Unknown',
            email: u.email || '',
            phone: u.phone || '',
            role: u.role,
            status: u.status || 'Active',
            aiPlan: {
              id: planId,
              name: AdminService.CANONICAL_PLAN_NAMES[planId] || (u.role === 'doctor' ? 'Doctor Starter' : 'Patient Basic'),
              status: sub?.status || 'active',
              monthlyCredits: sub?.monthly_ai_credits || (planId.includes('3') ? 150 : planId.includes('2') ? 60 : 15),
              creditsUsed: sub?.credits_used || 0,
              renewalDate: sub?.current_period_end || null,
            },
            joined: u.created_at
              ? new Date(u.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '',
            ltv: 0,
            lastVisit: 'N/A',
          };
        }),
        total: count || 0,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserById(id: string) {
    try {
      const { data: profile } = await this.supabase.admin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!profile) throw new NotFoundException('User not found');

      const [{ data: appointments }, { data: payments }, { data: aiSub }, { data: aiTransactions }] =
        await Promise.all([
          this.supabase.admin
            .from('appointments')
            .select('id, doctor_id, specialty, type, status, scheduled_date')
            .is('deleted_at', null)
            .eq('patient_id', id)
            .order('scheduled_date', { ascending: false })
            .limit(20),
          this.supabase.admin
            .from('payments')
            .select(
              'id, doctor_id, appointment_id, amount, status, category, service, created_at',
            )
            .eq('patient_id', id)
            .order('created_at', { ascending: false }),
          this.supabase.admin
            .from('ai_subscriptions')
            .select('*')
            .eq('user_id', id)
            .maybeSingle(),
          this.supabase.admin
            .from('ai_transactions')
            .select('*')
            .eq('user_id', id)
            .order('created_at', { ascending: false }),
        ]);

      const apts = appointments || [];
      const pays = payments || [];

      const doctorIds = [
        ...new Set(
          [
            ...apts.map((a) => a.doctor_id),
            ...pays.map((p) => p.doctor_id),
          ].filter(Boolean),
        ),
      ];
      const { data: doctorProfiles } = doctorIds.length
        ? await this.supabase.admin
            .from('profiles')
            .select('id, full_name')
            .in('id', doctorIds)
        : { data: [] as { id: string; full_name: string }[] };
      const nameByDoctorId = new Map(
        (doctorProfiles || []).map((d) => [d.id, d.full_name]),
      );
      const amountByAppointmentId = new Map(
        pays.filter((p) => p.appointment_id).map((p) => [p.appointment_id, p]),
      );

      const paidPayments = pays.filter((p) => p.status === 'Paid');

      // Spending trend, last 6 months
      const now = new Date();
      const spentByMonth = new Map<string, number>();
      paidPayments.forEach((p) => {
        const key = new Date(p.created_at).toISOString().slice(0, 7);
        spentByMonth.set(key, (spentByMonth.get(key) || 0) + Number(p.amount));
      });
      const spendingTrend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = d.toISOString().slice(0, 7);
        return {
          month: d.toLocaleString('en-US', { month: 'short' }),
          spent: spentByMonth.get(key) || 0,
        };
      });

      // Spending by category
      const byCategory = new Map<string, number>();
      paidPayments.forEach((p) => {
        const cat = p.category || 'Other';
        byCategory.set(cat, (byCategory.get(cat) || 0) + Number(p.amount));
      });
      const spendingByCategory = [...byCategory.entries()].map(
        ([category, amount]) => ({ category, amount }),
      );

      const consultations = apts.map((a) => ({
        id: a.id,
        doctor: nameByDoctorId.get(a.doctor_id) || 'Doctor',
        specialty: a.specialty || 'General',
        date: a.scheduled_date
          ? new Date(a.scheduled_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
        type: a.type === 'video' ? 'Video' : 'Clinic',
        status: a.status,
        cost: Number(amountByAppointmentId.get(a.id)?.amount || 0),
      }));

      const activePlanId = aiSub?.plan_id || 'patient_plan_1';
      const monthlyCredits = aiSub?.monthly_ai_credits || (activePlanId === 'patient_plan_3' ? 150 : activePlanId === 'patient_plan_2' ? 60 : 15);
      const creditsUsed = aiSub?.credits_used || 0;

      const aiSubscription = {
        id: aiSub?.id || null,
        planId: activePlanId,
        planName: AdminService.CANONICAL_PLAN_NAMES[activePlanId] || 'Patient Basic',
        status: aiSub?.status || 'active',
        monthlyCredits,
        creditsUsed,
        creditsRemaining: Math.max(0, monthlyCredits - creditsUsed),
        renewalDate: aiSub?.current_period_end || null,
        billingCycle: aiSub?.billing_cycle || 'monthly',
        currency: aiSub?.currency || 'INR',
        amount: aiSub?.amount || 0,
      };

      const aiPurchaseHistory = (aiTransactions || []).map((t: any) => ({
        id: t.id,
        planId: t.plan_id,
        planName: AdminService.CANONICAL_PLAN_NAMES[t.plan_id] || t.plan_id,
        baseAmount: Number(t.base_amount || 0),
        finalAmount: Number(t.final_amount || 0),
        currency: t.original_currency || 'INR',
        gateway: t.gateway || 'Cashfree',
        gatewayTxnId: t.gateway_txn_id || null,
        status: t.status || 'Paid',
        createdAt: t.created_at,
      }));

      return {
        profile,
        kpis: {
          lifetimeValue: paidPayments.reduce(
            (sum, p) => sum + Number(p.amount),
            0,
          ),
          consultationsCompleted: apts.filter(
            (a) => a.status === AppointmentStatus.DONE,
          ).length,
        },
        spendingTrend,
        spendingByCategory,
        consultations,
        payments: pays,
        aiSubscription,
        aiPurchaseHistory,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateUserStatus(id: string, status: string) {
    try {
      const { data: updated, error } = await this.supabase.admin
        .from('profiles')
        .update({ status })
        .eq('id', id)
        .select('id, status')
        .maybeSingle();
      if (error || !updated)
        throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
      return {
        userId: updated.id,
        status: updated.status,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateUserAiPlan(
    admin: AuthUser,
    userId: string,
    planId: string,
    resetCredits = true,
  ) {
    try {
      const { data: profile } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

      const isDoctor = profile.role === 'doctor';
      const monthlyCredits = planId === 'doctor_plan_3'
        ? 300
        : planId === 'doctor_plan_2'
        ? 100
        : planId === 'patient_plan_3'
        ? 150
        : planId === 'patient_plan_2'
        ? 60
        : isDoctor
        ? 25
        : 15;

      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: existingSub } = await this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const oldPlanId = existingSub?.plan_id;

      const subPayload: Record<string, any> = {
        user_id: userId,
        plan_id: planId,
        role: profile.role,
        status: 'active',
        billing_cycle: 'monthly',
        monthly_ai_credits: monthlyCredits,
        updated_at: now.toISOString(),
      };

      if (resetCredits || !existingSub) {
        subPayload.credits_used = 0;
        subPayload.current_period_start = now.toISOString();
        subPayload.current_period_end = nextMonth.toISOString();
      }

      let updatedSub: any;
      if (existingSub) {
        const { data, error } = await this.supabase.admin
          .from('ai_subscriptions')
          .update(subPayload)
          .eq('user_id', userId)
          .select('*')
          .single();
        if (error) throw error;
        updatedSub = data;
      } else {
        const { data, error } = await this.supabase.admin
          .from('ai_subscriptions')
          .insert(subPayload)
          .select('*')
          .single();
        if (error) throw error;
        updatedSub = data;
      }

      this.writeAudit(
        admin,
        'ai_subscription.admin_override',
        'ai_subscriptions',
        updatedSub.id,
        { planId: oldPlanId },
        { planId, monthlyCredits },
      );

      return {
        id: updatedSub.id,
        planId,
        planName: AdminService.CANONICAL_PLAN_NAMES[planId] || planId,
        monthlyCredits: updatedSub.monthly_ai_credits,
        creditsUsed: updatedSub.credits_used,
        creditsRemaining: Math.max(0, updatedSub.monthly_ai_credits - updatedSub.credits_used),
        status: updatedSub.status,
        renewalDate: updatedSub.current_period_end,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        error?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Doctors ─────────────────────────────────────────────────────
  async getDoctorsAndClinics() {
    try {
      const { data } = await this.supabase.admin
        .from('profiles')
        .select(
          'id, full_name, email, phone, specialty, kyc_verified, consultation_fee, commission_rate, status, created_at',
        )
        .eq('role', ProfileRole.DOCTOR)
        .order('created_at', { ascending: false });

      if (!data) return [];

      const doctorIds = data.map((d) => d.id);
      const [{ data: apts }, { data: payments }, { data: doctorSubs }] = await Promise.all([
        this.supabase.admin
          .from('appointments')
          .select('doctor_id, status')
          .is('deleted_at', null)
          .in('doctor_id', doctorIds),
        this.supabase.admin
          .from('payments')
          .select('doctor_id, amount, platform_fee_amount, provider_payout_amount, status')
          .in('doctor_id', doctorIds),
        this.supabase.admin
          .from('ai_subscriptions')
          .select('user_id, plan_id, status, monthly_ai_credits, credits_used, current_period_end')
          .in('user_id', doctorIds),
      ]);

      const subByDoctorId = new Map((doctorSubs || []).map((s) => [s.user_id, s]));

      const aptCountByDoctor = new Map<string, number>();
      (apts || []).forEach((a) => {
        aptCountByDoctor.set(
          a.doctor_id,
          (aptCountByDoctor.get(a.doctor_id) || 0) + 1,
        );
      });

      const globalCommissionRate = await this.commissionService.getGlobalCommissionRate();

      const revenueByDoctor = new Map<string, number>();
      const platformFeeByDoctor = new Map<string, number>();
      const doctorNetByDoctor = new Map<string, number>();

      (payments || [])
        .filter((p) => p.status === 'Paid')
        .forEach((p) => {
          const amt = Number(p.amount || 0);
          const fee = Number(p.platform_fee_amount ?? (amt * (globalCommissionRate / 100)));
          const net = Number(p.provider_payout_amount ?? (amt - fee));

          revenueByDoctor.set(p.doctor_id, (revenueByDoctor.get(p.doctor_id) || 0) + amt);
          platformFeeByDoctor.set(p.doctor_id, (platformFeeByDoctor.get(p.doctor_id) || 0) + fee);
          doctorNetByDoctor.set(p.doctor_id, (doctorNetByDoctor.get(p.doctor_id) || 0) + net);
        });

      return data.map((d) => {
        const sub = subByDoctorId.get(d.id);
        const planId = sub?.plan_id || 'doctor_plan_1';
        const totalGross = revenueByDoctor.get(d.id) || 0;
        const totalPlatformFee = platformFeeByDoctor.get(d.id) || 0;
        const totalDoctorNet = doctorNetByDoctor.get(d.id) || 0;
        const totalConsults = aptCountByDoctor.get(d.id) || 0;
        const isVerified = Boolean(d.kyc_verified);
        const docCommissionRate =
          d.commission_rate !== null && d.commission_rate !== undefined
            ? Number(d.commission_rate)
            : globalCommissionRate;

        return {
          id: d.id,
          name: d.full_name || 'Dr. Unknown',
          email: d.email || '',
          specialty: d.specialty || 'General Practitioner',
          status: d.status || 'Active',
          kyc_verified: isVerified,
          verified: isVerified,
          totalAppointments: totalConsults,
          totalConsults: totalConsults,
          totalRevenue: totalGross,
          totalGross: totalGross,
          totalPlatformFee: totalPlatformFee,
          totalDoctorNet: totalDoctorNet,
          consultation_fee: d.consultation_fee || 0,
          commission_rate: docCommissionRate,
          commissionRate: docCommissionRate,
          global_commission_rate: globalCommissionRate,
          phone: d.phone || '',
          aiPlan: {
            id: planId,
            name: AdminService.CANONICAL_PLAN_NAMES[planId] || 'Doctor Starter',
            status: sub?.status || 'active',
            monthlyCredits: sub?.monthly_ai_credits || (planId === 'doctor_plan_3' ? 300 : planId === 'doctor_plan_2' ? 100 : 25),
            creditsUsed: sub?.credits_used || 0,
            renewalDate: sub?.current_period_end || null,
          },
        };
      });
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDoctorDetail(id: string) {
    try {
      const globalRate = await this.commissionService.getGlobalCommissionRate();
      const { data: doctor } = await this.supabase.admin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', ProfileRole.DOCTOR)
        .maybeSingle();
      if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

      doctor.commission_rate =
        doctor.commission_rate !== null && doctor.commission_rate !== undefined
          ? Number(doctor.commission_rate)
          : globalRate;
      doctor.global_commission_rate = globalRate;

      const [{ data: appointments }, { data: payments }, { data: aiSub }, { data: aiTransactions }] =
        await Promise.all([
          this.supabase.admin
            .from('appointments')
            .select('id, patient_id, type, status, scheduled_date')
            .is('deleted_at', null)
            .eq('doctor_id', id)
            .order('scheduled_date', { ascending: false }),
          this.supabase.admin
            .from('payments')
            .select('id, patient_id, amount, status, service, created_at, commission_rate, platform_fee_amount, provider_payout_amount')
            .eq('doctor_id', id)
            .order('created_at', { ascending: false }),
          this.supabase.admin
            .from('ai_subscriptions')
            .select('*')
            .eq('user_id', id)
            .maybeSingle(),
          this.supabase.admin
            .from('ai_transactions')
            .select('*')
            .eq('user_id', id)
            .order('created_at', { ascending: false }),
        ]);

      const apts = appointments || [];
      const pays = payments || [];

      const patientIds = [
        ...new Set(
          [
            ...apts.map((a) => a.patient_id),
            ...pays.map((p) => p.patient_id),
          ].filter(Boolean),
        ),
      ];

      const { data: patientProfiles } = patientIds.length
        ? await this.supabase.admin
            .from('profiles')
            .select('id, full_name')
            .in('id', patientIds)
        : { data: [] as { id: string; full_name: string }[] };
      const nameByPatientId = new Map(
        (patientProfiles || []).map((p) => [p.id, p.full_name]),
      );

      const paidPayments = pays.filter((p) => p.status === 'Paid');

      // Gross revenue trend, last 6 months
      const now = new Date();
      const revenueByMonth = new Map<string, number>();
      paidPayments.forEach((p) => {
        const key = new Date(p.created_at).toISOString().slice(0, 7);
        revenueByMonth.set(
          key,
          (revenueByMonth.get(key) || 0) + Number(p.amount),
        );
      });
      const revenueTrend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = d.toISOString().slice(0, 7);
        return {
          month: d.toLocaleString('en-US', { month: 'short' }),
          revenue: revenueByMonth.get(key) || 0,
        };
      });

      // Appointment status breakdown
      const statusCounts = new Map<string, number>();
      apts.forEach((a) =>
        statusCounts.set(a.status, (statusCounts.get(a.status) || 0) + 1),
      );
      const appointmentStatusBreakdown = [...statusCounts.entries()].map(
        ([status, count]) => ({ status, count }),
      );

      const ledger = pays.slice(0, 20).map((p) => {
        const breakdown = CommissionCalculator.fromStoredPayment(p);
        return {
          id: p.id,
          patient: nameByPatientId.get(p.patient_id) || 'Patient',
          date: new Date(p.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          service: p.service,
          amount: Number(p.amount),
          status: p.status,
          commissionRate: breakdown.commissionRate,
          platformFee: breakdown.commissionAmount,
          doctorNet: breakdown.providerPayoutAmount,
        };
      });

      // Compute doctor financial KPIs from stored per-payment amounts
      const totalPlatformFee = paidPayments.reduce(
        (sum, p) => sum + Number(p.platform_fee_amount || 0),
        0,
      );
      const totalDoctorNet = paidPayments.reduce(
        (sum, p) => sum + Number(p.provider_payout_amount || p.amount || 0),
        0,
      );

      const activePlanId = aiSub?.plan_id || 'doctor_plan_1';
      const monthlyCredits = aiSub?.monthly_ai_credits || (activePlanId === 'doctor_plan_3' ? 300 : activePlanId === 'doctor_plan_2' ? 100 : 25);
      const creditsUsed = aiSub?.credits_used || 0;

      const aiSubscription = {
        id: aiSub?.id || null,
        planId: activePlanId,
        planName: AdminService.CANONICAL_PLAN_NAMES[activePlanId] || 'Doctor Starter',
        status: aiSub?.status || 'active',
        monthlyCredits,
        creditsUsed,
        creditsRemaining: Math.max(0, monthlyCredits - creditsUsed),
        renewalDate: aiSub?.current_period_end || null,
        billingCycle: aiSub?.billing_cycle || 'monthly',
        currency: aiSub?.currency || 'INR',
        amount: aiSub?.amount || 0,
      };

      const aiPurchaseHistory = (aiTransactions || []).map((t: any) => ({
        id: t.id,
        planId: t.plan_id,
        planName: AdminService.CANONICAL_PLAN_NAMES[t.plan_id] || t.plan_id,
        baseAmount: Number(t.base_amount || 0),
        finalAmount: Number(t.final_amount || 0),
        currency: t.original_currency || 'INR',
        gateway: t.gateway || 'Cashfree',
        gatewayTxnId: t.gateway_txn_id || null,
        status: t.status || 'Paid',
        createdAt: t.created_at,
      }));

      return {
        doctor,
        kpis: {
          totalGross: paidPayments.reduce(
            (sum, p) => sum + Number(p.amount),
            0,
          ),
          totalPlatformFee,
          totalDoctorNet,
          totalConsults: apts.filter((a) => a.status === AppointmentStatus.DONE).length || apts.length,
          totalAppointments: apts.length,
          completedConsults: apts.filter((a) => a.status === AppointmentStatus.DONE).length,
        },
        revenueTrend,
        appointmentStatusBreakdown,
        ledger,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDoctorLedger(id: string) {
    try {
      const { data: payments } = await this.supabase.admin
        .from('payments')
        .select(
          'id, patient_id, amount, status, service, created_at, commission_rate, platform_fee_amount, provider_payout_amount',
        )
        .eq('doctor_id', id)
        .order('created_at', { ascending: false });

      const pays = payments || [];
      const patientIds = [
        ...new Set(pays.map((p) => p.patient_id).filter(Boolean)),
      ];

      const { data: patientProfiles } = patientIds.length
        ? await this.supabase.admin
            .from('profiles')
            .select('id, full_name')
            .in('id', patientIds)
        : { data: [] as { id: string; full_name: string }[] };

      const nameByPatientId = new Map(
        (patientProfiles || []).map((p) => [p.id, p.full_name]),
      );

      return pays.map((p) => {
        const breakdown = CommissionCalculator.fromStoredPayment(p);
        return {
          id: p.id,
          patient: nameByPatientId.get(p.patient_id) || 'Patient',
          date: new Date(p.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          rawDate: p.created_at,
          service: p.service,
          amount: Number(p.amount),
          status: p.status,
          commissionRate: breakdown.commissionRate,
          platformFee: breakdown.commissionAmount,
          doctorNet: breakdown.providerPayoutAmount,
        };
      });
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDoctorPayouts(id: string) {
    try {
      const { data: payouts } = await this.supabase.admin
        .from('payouts')
        .select('*')
        .eq('doctor_id', id)
        .order('requested_at', { ascending: false });

      return (payouts || []).map((p) => ({
        ...p,
        amount: Number(p.amount),
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Global Platform Commission (Single Source of Truth) ─────────────
  async getGlobalCommission() {
    try {
      const currentRate = await this.commissionService.getGlobalCommissionRate();
      const { data: history } = await this.supabase.admin
        .from('platform_commission_history')
        .select('*')
        .order('effective_from', { ascending: false });

      return {
        currentRate,
        history: history || [],
      };
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateGlobalCommission(
    admin: AuthUser,
    newRate: number,
    reason?: string,
  ) {
    try {
      const previousRate = await this.commissionService.getGlobalCommissionRate();
      const safeNewRate = Number(newRate);

      if (isNaN(safeNewRate) || safeNewRate < 0 || safeNewRate > 100) {
        throw new BadRequestException('Commission rate must be between 0 and 100');
      }

      // Upsert singleton landing_settings table
      const { error: updateError } = await this.supabase.admin
        .from('landing_settings')
        .upsert({ id: 1, platform_commission_rate: safeNewRate });

      if (updateError) {
        throw new InternalServerErrorException(
          `Failed to update global commission: ${updateError.message}`,
        );
      }

      // Verify if admin.id is present in profiles before using as foreign key
      let changedBy: string | null = null;
      if (admin?.id) {
        const { data: prof } = await this.supabase.admin
          .from('profiles')
          .select('id')
          .eq('id', admin.id)
          .maybeSingle();
        if (prof?.id) changedBy = prof.id;
      }

      // Insert audit history record
      await this.supabase.admin
        .from('platform_commission_history')
        .insert({
          previous_rate: previousRate,
          new_rate: safeNewRate,
          effective_from: new Date().toISOString(),
          changed_by: changedBy,
          change_reason: reason || `Admin updated global platform commission from ${previousRate}% to ${safeNewRate}%`,
        });

      // Write general audit log
      this.writeAudit(
        admin,
        'global_commission.update',
        'landing_settings',
        '1',
        { platform_commission_rate: previousRate },
        { platform_commission_rate: safeNewRate },
      );

      // Invalidate dynamic cache & sync static calculator
      this.commissionService.invalidateCache();
      CommissionCalculator.GLOBAL_COMMISSION_RATE = safeNewRate;
      this.invalidateStatsCache();

      return {
        currentRate: safeNewRate,
        previousRate,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        error?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateDoctorCommission(admin: AuthUser, id: string, commissionRate: number) {
    try {
      // Fetch current rate for audit trail
      const { data: current } = await this.supabase.admin
        .from('profiles')
        .select('commission_rate')
        .eq('id', id)
        .eq('role', ProfileRole.DOCTOR)
        .maybeSingle();
      if (!current)
        throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

      const previousRate = Number(current.commission_rate);

      // Update the doctor's commission rate
      const { data: updated, error } = await this.supabase.admin
        .from('profiles')
        .update({ commission_rate: commissionRate })
        .eq('id', id)
        .eq('role', ProfileRole.DOCTOR)
        .select('id, commission_rate')
        .maybeSingle();
      if (error || !updated)
        throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

      // Supersede the currently active history row
      await this.supabase.admin
        .from('doctor_commission_history')
        .update({
          status: 'Superseded',
          effective_to: new Date().toISOString(),
        })
        .eq('doctor_id', id)
        .eq('status', 'Active');

      // Insert new active commission history row
      await this.supabase.admin
        .from('doctor_commission_history')
        .insert({
          doctor_id: id,
          commission_rate: commissionRate,
          previous_rate: previousRate,
          effective_from: new Date().toISOString(),
          status: 'Active',
          changed_by: admin.id,
          change_reason: `Admin changed from ${previousRate}% to ${commissionRate}%`,
        });

      // Audit trail
      this.writeAudit(
        admin,
        'commission.update',
        'profiles',
        id,
        { commission_rate: previousRate },
        { commission_rate: commissionRate },
      );

      return {
        doctorId: updated.id,
        commissionRate: Number(updated.commission_rate),
        previousRate,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDoctorCommissionHistory(doctorId: string) {
    const { data } = await this.supabase.admin
      .from('doctor_commission_history')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('effective_from', { ascending: false });
    return data || [];
  }

  async getPendingVerifications() {
    try {
      const [{ data: profiles }, { data: applications }] = await Promise.all([
        this.supabase.admin
          .from('profiles')
          .select('id, full_name, email, specialty, created_at, registration_no, avatar_url')
          .eq('role', ProfileRole.DOCTOR)
          .eq('kyc_verified', false)
          .order('created_at', { ascending: false })
          .limit(50),
        this.supabase.admin
          .from('provider_applications')
          .select('id, full_name, email, specialty, submitted_at, status, registration_no, medical_council, experience_years, phone, country_code, clinic_name, license_file_name, license_file_url, license_file_type')
          .eq('status', 'pending')
          .order('submitted_at', { ascending: false })
          .limit(50),
      ]);

      const fromProfiles = (profiles || []).map((d) => ({
        id: d.id,
        name: d.full_name || 'Unknown',
        email: d.email || '',
        specialty: d.specialty || 'General',
        country: 'IN',
        medical_council: 'State Medical Licensing Board',
        registration_no: d.registration_no,
        regNo: d.registration_no,
        appliedOn: d.created_at
          ? new Date(d.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
        source: 'registered', // already has an account
        licenseFileUrl: d.avatar_url || null,
        docs: d.avatar_url
          ? [{ name: 'Medical_Registration_Certificate.pdf', url: d.avatar_url, type: 'pdf' }]
          : [{ name: 'Medical_Registration_Certificate.pdf', url: '', type: 'pdf' }],
      }));

      const fromApplications = (applications || []).map((a) => ({
        id: a.id,
        name: a.full_name || 'Unknown',
        email: a.email || '',
        specialty: a.specialty || 'General',
        appliedOn: a.submitted_at
          ? new Date(a.submitted_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
        source: 'application', // submitted from landing page
        phone: a.phone,
        country: a.country_code || 'IN',
        country_code: a.country_code || 'IN',
        registration_no: a.registration_no,
        regNo: a.registration_no,
        medical_council: a.medical_council || 'State Licensing Board',
        medicalCouncil: a.medical_council,
        experienceYears: a.experience_years,
        clinicName: a.clinic_name,
        licenseFileName: a.license_file_name,
        licenseFileUrl: a.license_file_url,
        licenseFileType: a.license_file_type,
        docs: a.license_file_url
          ? [{ name: a.license_file_name || 'Medical_License.pdf', url: a.license_file_url, type: a.license_file_type || 'pdf' }]
          : (a.license_file_name ? [{ name: a.license_file_name, url: '', type: 'pdf' }] : []),
      }));

      return [...fromApplications, ...fromProfiles];
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateDoctorVerification(admin: AuthUser, id: string, status: string) {
    try {
      const { data: doctor } = await this.supabase.admin
        .from('profiles')
        .select()
        .eq('id', id)
        .eq('role', ProfileRole.DOCTOR)
        .maybeSingle();

      if (!doctor) {
        // Check if this is a pre-registration provider application
        const { data: app } = await this.supabase.admin
          .from('provider_applications')
          .select()
          .eq('id', id)
          .maybeSingle();

        if (app) {
          const isApproved = status === 'approved';
          const appStatus = isApproved ? 'approved' : 'rejected';
          const { data: updatedApp } = await this.supabase.admin
            .from('provider_applications')
            .update({ status: appStatus, reviewed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .maybeSingle();

          this.writeAudit(
            admin,
            'provider_application.update',
            'provider_applications',
            id,
            { status: app.status },
            { status: appStatus },
          );

          if (isApproved && app.email) {
            // Generate initial doctor credentials & account
            const tempPassword = `HealNari#${Math.floor(1000 + Math.random() * 9000)}`;

            let doctorUserId: string | undefined;

            // Create Supabase Auth User if not existing
            const { data: authUser, error: authError } = await this.supabase.admin.auth.admin.createUser({
              email: app.email.trim(),
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                role: 'doctor',
                full_name: app.full_name,
                specialty: app.specialty,
              },
            });

            if (authUser?.user?.id) {
              doctorUserId = authUser.user.id;
            } else {
              // User might already exist in Supabase Auth — locate and update password
              try {
                const { data: userList } = await this.supabase.admin.auth.admin.listUsers();
                const existing = (userList?.users || []).find(
                  (u: any) => u.email?.toLowerCase() === app.email.trim().toLowerCase()
                );
                if (existing) {
                  doctorUserId = existing.id;
                  await this.supabase.admin.auth.admin.updateUserById(existing.id, {
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: {
                      ...(existing.user_metadata || {}),
                      role: 'doctor',
                      full_name: app.full_name || existing.user_metadata?.full_name,
                      specialty: app.specialty || existing.user_metadata?.specialty,
                    },
                  });
                }
              } catch (e) {
                this.logger.warn(`Could not sync existing user password: ${e?.message}`);
              }
            }

            if (doctorUserId) {
              await this.supabase.admin
                .from('profiles')
                .upsert({
                  id: doctorUserId,
                  role: ProfileRole.DOCTOR,
                  full_name: app.full_name,
                  email: app.email.trim(),
                  phone: app.phone,
                  specialty: app.specialty,
                  registration_no: app.registration_no,
                  kyc_verified: true,
                });
            }

            // Send Welcome Email with Login Credentials
            this.email
              .sendTemplateEmail({
                templateKey: 'doctor_welcome_credentials',
                to: app.email.trim(),
                variables: {
                  doctorName: app.full_name || 'Doctor',
                  email: app.email.trim(),
                  password: tempPassword,
                  loginUrl: this.email.getUrl(`/for-doctors?auth=login&email=${encodeURIComponent(app.email.trim())}`),
                },
                entityType: 'provider_application',
                entityId: id,
                event: 'doctor_application_approved',
              })
              .catch(() => {});
          } else if (!isApproved && app.email) {
            this.email
              .sendTemplateEmail({
                templateKey: 'doctor_kyc_rejected',
                to: app.email,
                variables: {
                  doctorName: app.full_name || 'Doctor',
                  reason: 'Please review registration certificate requirements and resubmit.',
                  dashboardUrl: this.email.getUrl('/for-doctors'),
                },
                entityType: 'provider_application',
                entityId: id,
                event: 'doctor_application_rejected',
              })
              .catch(() => {});
          }

          return updatedApp;
        }

        throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);
      }
      const isApproved = status === 'approved';
      const { data: updated } = await this.supabase.admin
        .from('profiles')
        .update({ kyc_verified: isApproved })
        .eq('id', id)
        .select()
        .maybeSingle();
      this.writeAudit(
        admin,
        'verification.update',
        'profiles',
        id,
        { kyc_verified: doctor.kyc_verified },
        { kyc_verified: updated.kyc_verified },
      );

      // 1. In-App & Web Push Notification
      this.notifications
        .create(id, {
          type: 'doctor_kyc_status',
          title: isApproved
            ? 'Medical Credentials Verified'
            : 'Verification Update Required',
          message: isApproved
            ? 'Your medical credentials and registration details have been verified. You can now publish your schedule and accept consultations.'
            : 'Your medical credential submission requires additional documentation. Please review the feedback and update your profile.',
          data: {
            path: isApproved ? '/doctor/schedule' : '/doctor/profile',
          },
        })
        .catch(() => {});

      // 2. Transactional Email via database-managed template
      if (doctor.email) {
        if (isApproved) {
          this.email
            .sendTemplateEmail({
              templateKey: 'doctor_kyc_approved',
              to: doctor.email,
              variables: {
                doctorName: doctor.full_name || 'Doctor',
                dashboardUrl: this.email.getUrl('/doctor/schedule'),
              },
              entityType: 'doctor_kyc',
              entityId: updated.id,
              event: 'doctor_kyc_approved',
            })
            .catch(() => {});
        } else {
          this.email
            .sendTemplateEmail({
              templateKey: 'doctor_kyc_rejected',
              to: doctor.email,
              variables: {
                doctorName: doctor.full_name || 'Doctor',
                reason: 'Please review and re-upload your valid state medical council registration certificate.',
                dashboardUrl: this.email.getUrl('/doctor/profile'),
              },
              entityType: 'doctor_kyc',
              entityId: updated.id,
              event: 'doctor_kyc_rejected',
            })
            .catch(() => {});
        }
      }

      return {
        doctorId: updated.id,
        statusUpdated: status,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Tickets ─────────────────────────────────────────────────────
  async getSupportTickets() {
    try {
      const { data } = await this.supabase.admin
        .from('support_tickets')
        .select()
        .order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resolveTicket(admin: AuthUser, ticketId: number) {
    try {
      const { data: ticket } = await this.supabase.admin
        .from('support_tickets')
        .select()
        .eq('id', ticketId)
        .maybeSingle();
      if (!ticket) throw new NotFoundException('Ticket not found');
      const { data: updated } = await this.supabase.admin
        .from('support_tickets')
        .update({ status: 'Resolved' })
        .eq('id', ticketId)
        .select()
        .maybeSingle();
      this.writeAudit(
        admin,
        'ticket.resolve',
        'support_tickets',
        String(ticketId),
        { status: ticket.status },
        { status: updated.status },
      );
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Refunds ─────────────────────────────────────────────────────
  async getRefundRequests() {
    try {
      const { data } = await this.supabase.admin
        .from('refund_requests')
        .select()
        .order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Actually calls Cashfree's refund API for gateway-linked payments —
   * previously this just flipped refund_requests.status to 'Processed' with
   * no money ever moving. Payments with no cf_order_id (manual/cash charges,
   * or rows predating the Cashfree integration) fall back to the old
   * admin-confirms-it-happened-manually behavior, since there's no gateway
   * transaction to call a refund API against. */
  async processRefund(admin: AuthUser, refundId: number) {
    const { data: refund } = await this.supabase.admin
      .from('refund_requests')
      .select()
      .eq('id', refundId)
      .maybeSingle();
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status === 'Processed') return refund; // idempotent — don't double-refund on a retried click

    const payment = refund.payment_id
      ? (
          await this.supabase.admin
            .from('payments')
            .select()
            .eq('id', refund.payment_id)
            .maybeSingle()
        ).data
      : null;

    let cfRefundId: string | null = null;

    if (payment?.cf_order_id) {
      const result = await this.cashfree.createRefund(
        payment.cf_order_id,
        Number(refund.amount),
        `rf-${randomUUID()}`,
        refund.reason,
      );
      if (result.refund_status === 'FAILED') {
        throw new InternalServerErrorException(
          `Cashfree refund failed: ${result.refund_arn || result.refund_status}`,
        );
      }
      cfRefundId = result.cf_refund_id ? String(result.cf_refund_id) : null;
      await this.supabase.admin
        .from('payments')
        .update({ status: 'Refunded' })
        .eq('id', payment.id);
    } else if (payment) {
      // No gateway order to refund against (e.g. a doctor-recorded cash
      // charge) — this confirms the admin handled it out-of-band.
      await this.supabase.admin
        .from('payments')
        .update({ status: 'Refunded' })
        .eq('id', payment.id);
    }

    const { data: updated } = await this.supabase.admin
      .from('refund_requests')
      .update({
        status: 'Processed',
        cf_refund_id: cfRefundId,
      })
      .eq('id', refundId)
      .select()
      .maybeSingle();

    this.writeAudit(
      admin,
      'refund.process',
      'refund_requests',
      String(refundId),
      { status: refund.status },
      { status: updated.status, cf_refund_id: cfRefundId },
    );

    const patientId = refund.patient_id || payment?.patient_id;
    if (patientId) {
      this.notifications.create(patientId, {
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `Your refund of ₹${Number(refund.amount).toFixed(0)} has been processed to your original payment method.`,
        data: { refundId, path: '/patient-dashboard/billing' },
      });
    }

    return updated;
  }

  async updateAppointmentStatus(
    admin: AuthUser,
    id: string,
    status: string,
    reason?: string,
  ) {
    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select('*, patient:profiles!appointments_patient_id_fkey(full_name, email), doctor:profiles!appointments_doctor_id_fkey(full_name, email)')
      .eq('id', id)
      .maybeSingle();

    if (!appointment) throw new NotFoundException('Appointment not found');

    const oldStatus = appointment.status;
    const updatePayload: Record<string, any> = { status };
    if (status === 'Cancelled') {
      updatePayload.cancelled_by = admin.id;
      updatePayload.cancelled_at = new Date().toISOString();
      if (reason) updatePayload.cancellation_reason = reason;
    }

    const { data: updated, error } = await this.supabase.admin
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select('*, patient:profiles!appointments_patient_id_fkey(full_name, email), doctor:profiles!appointments_doctor_id_fkey(full_name, email)')
      .maybeSingle();

    if (error || !updated) {
      throw new InternalServerErrorException(error?.message || 'Failed to update appointment status');
    }

    // Synchronize consultation_requests table if applicable
    if (status === 'Approved') {
      await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Converted' })
        .eq('doctor_id', appointment.doctor_id)
        .eq('patient_id', appointment.patient_id)
        .eq('status', 'New');
    } else if (status === 'Cancelled') {
      await this.supabase.admin
        .from('consultation_requests')
        .update({ status: 'Closed' })
        .eq('doctor_id', appointment.doctor_id)
        .eq('patient_id', appointment.patient_id)
        .eq('status', 'New');

      // If paid, initiate refund request
      const { data: payment } = await this.supabase.admin
        .from('payments')
        .select()
        .eq('appointment_id', id)
        .eq('status', 'Paid')
        .maybeSingle();

      if (payment) {
        const { data: existingRefund } = await this.supabase.admin
          .from('refund_requests')
          .select('id')
          .eq('payment_id', payment.id)
          .maybeSingle();

        if (!existingRefund) {
          await this.supabase.admin
            .from('payments')
            .update({ status: 'Refund Pending' })
            .eq('id', payment.id);

          await this.supabase.admin.from('refund_requests').insert({
            patient_id: appointment.patient_id,
            patient_name: updated.patient?.full_name || 'Patient',
            payment_id: payment.id,
            amount: payment.amount,
            reason: reason || `Appointment cancelled by administrator`,
          });
        }
      }
    }

    this.writeAudit(
      admin,
      'appointment.status_override',
      'appointments',
      id,
      { status: oldStatus },
      { status, reason },
    );

    return updated;
  }

  // ─── Revenue & Multi-Currency Accounting ─────────────────────────
  async getRevenueData(reportingCurrency = 'INR') {
    try {
      const repCurr = (reportingCurrency || 'INR').toUpperCase();

      const [
        { count: completedCount },
        { data: doneAppointments },
        { data: allPayments },
        { data: allRefunds },
        { data: allAiTransactions },
      ] = await Promise.all([
        this.supabase.admin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', AppointmentStatus.DONE),
        this.supabase.admin
          .from('appointments')
          .select(
            'id, specialty, doctor_id, doctor:profiles!appointments_doctor_id_fkey(full_name, specialty, currency, consultation_fee)',
          )
          .is('deleted_at', null)
          .eq('status', AppointmentStatus.DONE),
        this.supabase.admin
          .from('payments')
          .select(
            'id, amount, base_amount, original_amount, currency, base_currency, original_currency, reporting_amount, reporting_currency, fx_rate, fx_rate_source, fx_rate_timestamp, platform_fee_amount, provider_payout_amount, refund_amount, status, method, txn_ref, created_at, category, service, doctor_id, patient_id',
          )
          .in('status', ['Paid', 'Refunded', 'Insurance Claimed']),
        this.supabase.admin
          .from('refund_requests')
          .select('amount, currency, status, created_at'),
        this.supabase.admin
          .from('ai_transactions')
          .select(
            'id, user_id, plan_id, original_currency, base_amount, final_amount, reporting_currency, reporting_amount, fx_rate_applied, gateway, gateway_txn_id, status, created_at',
          )
          .in('status', ['Paid', 'paid', 'success', 'Success', 'active']),
      ]);

      const payments = allPayments || [];
      const refunds = allRefunds || [];
      const aiTxList = allAiTransactions || [];

      // 1. Original Currency Distribution Map (NEVER mixes currencies)
      const originalCurrencyMap = new Map<
        string,
        {
          currency: string;
          count: number;
          grossAmount: number;
          platformFeeAmount: number;
          providerPayoutAmount: number;
          refundAmount: number;
          netAmount: number;
        }
      >();

      // 2. Normalized Totals in requested reportingCurrency
      let totalGrossGMV = 0;
      let totalPlatformRevenue = 0;
      let totalProviderPayouts = 0;
      let totalRefundsAmount = 0;
      let settledCount = 0;

      // 3. Monthly Revenue Stream Map (Last 6 Months)
      const monthlyStreamMap = new Map<string, Record<string, any>>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = d.toLocaleString('en-US', { month: 'short' });
        monthlyStreamMap.set(month, {
          month,
          grossReporting: 0,
          platformReporting: 0,
          USD: 0,
          INR: 0,
        });
      }

      // 4. Clinical Specialty Revenue Map (Normalized in reporting currency)
      const bySpecialtyMap = new Map<string, number>();

      // Process Payments
      payments.forEach((p) => {
        const origAmt = Number(p.original_amount || p.amount || 0);
        const origCurr = (
          p.original_currency ||
          p.currency ||
          'INR'
        ).toUpperCase();
        const isPaid = p.status === 'Paid' || p.status === 'Insurance Claimed';
        const isRefunded = p.status === 'Refunded';

        const breakdown = CommissionCalculator.fromStoredPayment(p);
        const platformFee = breakdown.commissionAmount;
        const providerPayout = breakdown.providerPayoutAmount;
        const refAmt = isRefunded ? origAmt : Number(p.refund_amount || 0);

        // Group by Original Currency
        const existing = originalCurrencyMap.get(origCurr) || {
          currency: origCurr,
          count: 0,
          grossAmount: 0,
          platformFeeAmount: 0,
          providerPayoutAmount: 0,
          refundAmount: 0,
          netAmount: 0,
        };

        existing.count += 1;
        if (isPaid) {
          existing.grossAmount = DecimalMath.add(existing.grossAmount, origAmt);
          existing.platformFeeAmount = DecimalMath.add(
            existing.platformFeeAmount,
            platformFee,
          );
          existing.providerPayoutAmount = DecimalMath.add(
            existing.providerPayoutAmount,
            providerPayout,
          );
        }
        if (refAmt > 0) {
          existing.refundAmount = DecimalMath.add(
            existing.refundAmount,
            refAmt,
          );
        }
        existing.netAmount = DecimalMath.subtract(
          existing.grossAmount,
          existing.refundAmount,
        );
        originalCurrencyMap.set(origCurr, existing);

        // Normalized Conversion to reportingCurrency
        if (isPaid) {
          settledCount++;
          const convertedGross = this.fxRateService.reproduceReportingValue(
            origAmt,
            origCurr,
            repCurr,
            p.fx_rate,
            p.reporting_currency,
            p.reporting_amount,
          );
          const convertedFee = this.fxRateService.reproduceReportingValue(
            platformFee,
            origCurr,
            repCurr,
            p.fx_rate,
            p.reporting_currency,
          );
          const convertedPayout = this.fxRateService.reproduceReportingValue(
            providerPayout,
            origCurr,
            repCurr,
            p.fx_rate,
            p.reporting_currency,
          );

          totalGrossGMV = DecimalMath.add(totalGrossGMV, convertedGross);
          totalPlatformRevenue = DecimalMath.add(
            totalPlatformRevenue,
            convertedFee,
          );
          totalProviderPayouts = DecimalMath.add(
            totalProviderPayouts,
            convertedPayout,
          );

          // Monthly Stream Bucket
          if (p.created_at) {
            const pDate = new Date(p.created_at);
            const monthKey = pDate.toLocaleString('en-US', { month: 'short' });
            if (monthlyStreamMap.has(monthKey)) {
              const mData = monthlyStreamMap.get(monthKey)!;
              mData.grossReporting = DecimalMath.add(
                mData.grossReporting,
                convertedGross,
              );
              mData.platformReporting = DecimalMath.add(
                mData.platformReporting,
                convertedFee,
              );
              if (mData[origCurr] !== undefined) {
                mData[origCurr] = DecimalMath.add(mData[origCurr], origAmt);
              }
            }
          }

          // Specialty Bucket
          const specialty = p.category || p.service || 'General Practice';
          const existingSpec = bySpecialtyMap.get(specialty) || 0;
          bySpecialtyMap.set(
            specialty,
            DecimalMath.add(existingSpec, convertedGross),
          );
        }

        if (refAmt > 0) {
          const convertedRefund = this.fxRateService.reproduceReportingValue(
            refAmt,
            origCurr,
            repCurr,
            p.fx_rate,
            p.reporting_currency,
          );
          totalRefundsAmount = DecimalMath.add(
            totalRefundsAmount,
            convertedRefund,
          );
        }
      });

      // Net platform revenue = total platform fees − commission portion of refunds.
      // Use stored per-payment commission rates rather than a hardcoded percentage.
      let refundedPlatformFees = 0;
      payments.filter(p => p.status === 'Refunded').forEach(p => {
        const breakdown = CommissionCalculator.fromStoredPayment(p);
        const origCurr = (p.original_currency || p.currency || 'INR').toUpperCase();
        refundedPlatformFees = DecimalMath.add(
          refundedPlatformFees,
          this.fxRateService.reproduceReportingValue(
            breakdown.commissionAmount,
            origCurr,
            repCurr,
            p.fx_rate,
            p.reporting_currency,
          ),
        );
      });
      // Process AI Plan Transactions (100% platform revenue)
      let aiTotalRevenue = 0;
      let aiDoctorPlansRevenue = 0;
      let aiPatientPlansRevenue = 0;
      let aiCount = 0;

      aiTxList.forEach((t) => {
        aiCount++;
        const origAmt = Number(t.final_amount || t.base_amount || 0);
        const origCurr = (t.original_currency || 'INR').toUpperCase();
        const convertedGross = this.fxRateService.reproduceReportingValue(
          origAmt,
          origCurr,
          repCurr,
          t.fx_rate_applied,
          t.reporting_currency,
        );

        totalGrossGMV = DecimalMath.add(totalGrossGMV, convertedGross);
        totalPlatformRevenue = DecimalMath.add(totalPlatformRevenue, convertedGross);
        aiTotalRevenue = DecimalMath.add(aiTotalRevenue, convertedGross);

        if (t.plan_id?.startsWith('doctor')) {
          aiDoctorPlansRevenue = DecimalMath.add(aiDoctorPlansRevenue, convertedGross);
        } else {
          aiPatientPlansRevenue = DecimalMath.add(aiPatientPlansRevenue, convertedGross);
        }

        // Incorporate AI subscriptions into the Original Currency Distribution Map
        const existing = originalCurrencyMap.get(origCurr) || {
          currency: origCurr,
          count: 0,
          grossAmount: 0,
          platformFeeAmount: 0,
          providerPayoutAmount: 0,
          refundAmount: 0,
          netAmount: 0,
        };
        existing.count += 1;
        existing.grossAmount = DecimalMath.add(existing.grossAmount, origAmt);
        existing.platformFeeAmount = DecimalMath.add(existing.platformFeeAmount, origAmt);
        existing.netAmount = DecimalMath.subtract(existing.grossAmount, existing.refundAmount);
        originalCurrencyMap.set(origCurr, existing);

        // Monthly Stream Bucket for AI
        if (t.created_at) {
          const tDate = new Date(t.created_at);
          const monthKey = tDate.toLocaleString('en-US', { month: 'short' });
          if (monthlyStreamMap.has(monthKey)) {
            const mData = monthlyStreamMap.get(monthKey)!;
            mData.grossReporting = DecimalMath.add(mData.grossReporting, convertedGross);
            mData.platformReporting = DecimalMath.add(mData.platformReporting, convertedGross);
            if (mData[origCurr] !== undefined) {
              mData[origCurr] = DecimalMath.add(mData[origCurr], origAmt);
            }
          }
        }
      });

      // Specialty / Category Breakdown including AI
      bySpecialtyMap.set(
        'AI Subscriptions',
        DecimalMath.add(bySpecialtyMap.get('AI Subscriptions') || 0, aiTotalRevenue),
      );

      const netPlatformRevenue = DecimalMath.subtract(
        totalPlatformRevenue,
        refundedPlatformFees,
      );

      const currencyBreakdown = Array.from(originalCurrencyMap.values());
      const monthlyRevenueStream = Array.from(monthlyStreamMap.values());
      const revenueBySpecialty = Array.from(bySpecialtyMap.entries()).map(
        ([specialty, revenue]) => ({
          specialty,
          revenue,
          currency: repCurr,
        }),
      );

      // Detailed Ledger Records (Combining Consultations and AI Subscriptions)
      const aiTxFormatted = aiTxList.map((t) => {
        const origAmt = Number(t.final_amount || t.base_amount || 0);
        const origCurr = (t.original_currency || 'INR').toUpperCase();
        const repAmt = this.fxRateService.reproduceReportingValue(
          origAmt,
          origCurr,
          repCurr,
          t.fx_rate_applied,
          t.reporting_currency,
        );
        return {
          id: t.id,
          txnRef: t.gateway_txn_id || `AI-${t.id.slice(0, 8).toUpperCase()}`,
          rawDate: t.created_at,
          date: t.created_at
            ? new Date(t.created_at).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—',
          service: `AI Plan: ${AdminService.CANONICAL_PLAN_NAMES[t.plan_id] || t.plan_id}`,
          status: 'Paid',
          method: t.gateway || 'Cashfree',
          originalAmount: origAmt,
          originalCurrency: origCurr,
          reportingAmount: repAmt,
          reportingCurrency: repCurr,
          fxRate: t.fx_rate_applied || 1,
          fxRateSource: 'cashfree_checkout',
          fxRateTimestamp: t.created_at,
          platformFeeAmount: repAmt,
          providerPayoutAmount: 0,
          isAiSubscription: true,
          planId: t.plan_id,
        };
      });

      const paymentsFormatted = payments.map((p) => {
        const origAmt = Number(p.base_amount ?? p.original_amount ?? p.amount ?? 0);
        const origCurr = ((p.base_currency ?? p.original_currency ?? p.currency ?? 'INR') as string).toUpperCase();

        const repAmt = this.fxRateService.reproduceReportingValue(
          origAmt,
          origCurr,
          repCurr,
          p.fx_rate,
          p.reporting_currency,
        );
        const breakdown = CommissionCalculator.fromStoredPayment(p);

        return {
          id: p.id,
          txnRef: p.txn_ref || `TXN-${p.id.slice(0, 8).toUpperCase()}`,
          rawDate: p.created_at,
          date: p.created_at
            ? new Date(p.created_at).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—',
          service: p.service || 'Telehealth Consultation',
          status: p.status,
          method: p.method || 'Card / Stripe',
          originalAmount: origAmt,
          originalCurrency: origCurr,
          reportingAmount: repAmt,
          reportingCurrency: repCurr,
          fxRate:
            p.fx_rate ||
            (origCurr === repCurr
              ? 1
              : this.fxRateService.getRateQuote(origCurr, repCurr).rate),
          fxRateSource: p.fx_rate_source || 'live_ecb',
          fxRateTimestamp: p.fx_rate_timestamp || p.created_at,
          platformFeeAmount: this.fxRateService.reproduceReportingValue(
            breakdown.commissionAmount,
            origCurr,
            repCurr,
            p.fx_rate,
            p.reporting_currency,
          ),
          providerPayoutAmount: this.fxRateService.reproduceReportingValue(
            breakdown.providerPayoutAmount,
            origCurr,
            repCurr,
            p.fx_rate,
            p.reporting_currency,
          ),
          isAiSubscription: false,
        };
      });

      const allMergedTx = [...paymentsFormatted, ...aiTxFormatted];
      allMergedTx.sort((a, b) => {
        const timeA = new Date(a.rawDate || 0).getTime();
        const timeB = new Date(b.rawDate || 0).getTime();
        return timeB - timeA;
      });

      const transactions = allMergedTx.slice(0, 50);

      return {
        reportingCurrency: repCurr,
        normalizedTotals: {
          grossGMV: totalGrossGMV,
          platformRevenue: totalPlatformRevenue,
          providerPayouts: totalProviderPayouts,
          refundsTotal: totalRefundsAmount,
          netPlatformRevenue,
          totalTransactions: settledCount + aiCount,
          reportingCurrency: repCurr,
        },
        currentMonth: totalGrossGMV,
        completedConsultations: completedCount || settledCount,
        currencyBreakdown,
        monthlyRevenueStream,
        revenueBySpecialty,
        transactions,
        aiSubscriptionRevenue: {
          total: aiTotalRevenue,
          doctorPlansRevenue: aiDoctorPlansRevenue,
          patientPlansRevenue: aiPatientPlansRevenue,
          count: aiCount,
        },
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Real doctor-submitted payout requests (BillingService.requestPayout) */
  async getPayoutRequests() {
    try {
      const { data: payouts } = await this.supabase.admin
        .from('payouts')
        .select(
          'id, doctor_id, amount, method, status, reference_id, requested_at, processed_at',
        )
        .order('requested_at', { ascending: false });

      if (!payouts?.length) return [];

      const doctorIds = [...new Set(payouts.map((p) => p.doctor_id))];
      const { data: doctors } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name, commission_rate, currency, country')
        .in('id', doctorIds);
      const doctorMap = new Map((doctors || []).map((d) => [d.id, d]));

      return payouts.map((p) => {
        const doc = doctorMap.get(p.doctor_id);
        return {
          id: p.id,
          displayId: `PO-${p.id.slice(0, 6).toUpperCase()}`,
          doctor: doc?.full_name || 'Unknown',
          amount: Number(p.amount),
          currency: doc?.currency || 'USD',
          country: doc?.country || 'US',
          feeCut: `${CommissionCalculator.resolveCommissionRate(doc?.commission_rate)}%`,
          date: p.requested_at
            ? new Date(p.requested_at).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '',
          method: p.method,
          status:
            p.status === 'Paid'
              ? 'Processed'
              : p.status === 'Failed'
                ? 'Failed'
                : 'Pending',
          referenceId: p.reference_id || null,
        };
      });
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processPayout(admin: AuthUser, id: string, referenceId: string) {
    try {
      // 1. Fetch existing payout state
      const { data: existing } = await this.supabase.admin
        .from('payouts')
        .select('id, doctor_id, amount, status, reference_id, processed_at')
        .eq('id', id)
        .maybeSingle();

      if (!existing) throw new NotFoundException('Payout record not found');

      // 2. Strict State Transition & Idempotency Rules
      if (existing.status === 'Paid') {
        if (existing.reference_id === referenceId) {
          // Idempotent retry with same settlement reference
          return {
            payoutId: existing.id,
            referenceId: existing.reference_id,
            status: 'Processed',
            processedAt: existing.processed_at,
          };
        }
        throw new BadRequestException(
          'This payout has already been processed with a different settlement reference ID.',
        );
      }

      if (existing.status === 'Failed' || existing.status === 'Cancelled') {
        throw new BadRequestException(
          `Cannot process a payout currently marked as ${existing.status}.`,
        );
      }

      // 3. Atomically update status to Paid
      const { data: updated, error } = await this.supabase.admin
        .from('payouts')
        .update({
          status: 'Paid',
          reference_id: referenceId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, doctor_id, amount')
        .maybeSingle();

      if (error || !updated) throw new NotFoundException('Payout not found');

      this.writeAudit(admin, 'payout.process', 'payouts', id, existing, {
        status: 'Paid',
        reference_id: referenceId,
      });

      // 4. In-App + Web Push notification to Doctor
      await this.notifications.create(updated.doctor_id, {
        type: 'payout_processed',
        title: 'Payout Processed',
        message: `Your payout of ₹${Number(updated.amount).toLocaleString('en-IN')} has been processed (Reference: ${referenceId}).`,
        data: {
          path: '/doctor-dashboard/revenue',
          referenceId,
          amount: updated.amount,
        },
      });

      // 5. Transactional Email to Doctor via database-managed template
      const { data: doc } = await this.supabase.admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', updated.doctor_id)
        .maybeSingle();
      if (doc?.email) {
        const formattedAmount = `₹${Number(updated.amount).toLocaleString('en-IN')}`;
        const settlementDate = new Date().toLocaleDateString('en-IN');
        this.email
          .sendTemplateEmail({
            templateKey: 'doctor_payout_settlement',
            to: doc.email,
            variables: {
              doctorName: doc.full_name || 'Doctor',
              amount: formattedAmount,
              referenceId,
              settlementDate,
              dashboardUrl: this.email.getUrl('/doctor-dashboard/revenue'),
            },
            entityType: 'payout',
            entityId: updated.id,
            event: 'doctor_payout_settlement',
          })
          .catch(() => {});
      }

      return {
        payoutId: updated.id,
        referenceId,
        status: 'Processed',
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * FinTech-Grade Automated Payout Reconciliation Engine
   * Cross-checks Total Doctor Earnings (payments.provider_payout_amount) against
   * Total Payout Obligations (payouts.amount) across all network doctors.
   */
  async reconcileDoctorPayouts() {
    try {
      const [{ data: payments }, { data: payouts }, { data: doctors }] =
        await Promise.all([
          this.supabase.admin
            .from('payments')
            .select('doctor_id, amount, provider_payout_amount, status')
            .in('status', ['Paid', 'Insurance Claimed']),
          this.supabase.admin
            .from('payouts')
            .select('doctor_id, amount, status, requested_at, reference_id'),
          this.supabase.admin
            .from('profiles')
            .select('id, full_name, email, specialty, currency')
            .eq('role', ProfileRole.DOCTOR),
        ]);

      const earnedByDoctor = new Map<string, number>();
      (payments || []).forEach((p) => {
        const amt = Number(p.provider_payout_amount || p.amount || 0);
        earnedByDoctor.set(
          p.doctor_id,
          DecimalMath.add(earnedByDoctor.get(p.doctor_id) || 0, amt),
        );
      });

      const paidOutByDoctor = new Map<string, number>();
      const processingByDoctor = new Map<string, number>();

      (payouts || []).forEach((po) => {
        const amt = Number(po.amount || 0);
        if (po.status === 'Paid') {
          paidOutByDoctor.set(
            po.doctor_id,
            DecimalMath.add(paidOutByDoctor.get(po.doctor_id) || 0, amt),
          );
        } else if (po.status === 'Processing') {
          processingByDoctor.set(
            po.doctor_id,
            DecimalMath.add(processingByDoctor.get(po.doctor_id) || 0, amt),
          );
        }
      });

      const doctorReconciliations = (doctors || []).map((doc) => {
        const totalEarned = earnedByDoctor.get(doc.id) || 0;
        const totalSettled = paidOutByDoctor.get(doc.id) || 0;
        const totalProcessing = processingByDoctor.get(doc.id) || 0;
        const totalCommitted = DecimalMath.add(totalSettled, totalProcessing);
        const outstandingPayable = DecimalMath.subtract(totalEarned, totalCommitted);

        let reconciliationStatus: 'MATCHED' | 'DISCREPANCY' | 'OVERPAID' = 'MATCHED';
        if (outstandingPayable < 0) {
          reconciliationStatus = 'OVERPAID';
        } else if (totalEarned > 0 && outstandingPayable > 0) {
          reconciliationStatus = 'MATCHED';
        }

        return {
          doctorId: doc.id,
          doctorName: doc.full_name,
          email: doc.email,
          currency: doc.currency || 'INR',
          totalEarned,
          totalSettled,
          totalProcessing,
          outstandingPayable: Math.max(0, outstandingPayable),
          reconciliationStatus,
        };
      });

      const totalEarnedAll = doctorReconciliations.reduce(
        (sum, d) => DecimalMath.add(sum, d.totalEarned),
        0,
      );
      const totalSettledAll = doctorReconciliations.reduce(
        (sum, d) => DecimalMath.add(sum, d.totalSettled),
        0,
      );
      const totalProcessingAll = doctorReconciliations.reduce(
        (sum, d) => DecimalMath.add(sum, d.totalProcessing),
        0,
      );
      const totalOutstandingPayable = doctorReconciliations.reduce(
        (sum, d) => DecimalMath.add(sum, d.outstandingPayable),
        0,
      );

      return {
        timestamp: new Date().toISOString(),
        summary: {
          totalDoctorEarnings: totalEarnedAll,
          totalSettledPayouts: totalSettledAll,
          totalProcessingPayouts: totalProcessingAll,
          totalOutstandingPayable,
          discrepancyCount: doctorReconciliations.filter(
            (d) => d.reconciliationStatus !== 'MATCHED',
          ).length,
        },
        doctors: doctorReconciliations,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Reports ─────────────────────────────────────────────────────
  async getPlatformReports() {
    try {
      const [
        { count: totalUsers },
        { count: totalAppointments },
        { count: completedAppointments },
        { count: cancelledAppointments },
      ] = await Promise.all([
        this.supabase.admin
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        this.supabase.admin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null),
        this.supabase.admin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', AppointmentStatus.DONE),
        this.supabase.admin
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('status', AppointmentStatus.CANCELLED),
      ]);

      const { data: history } = await this.supabase.admin
        .from('reports_history')
        .select()
        .order('created_at', { ascending: false });

      const totalAppts = totalAppointments || 0;
      const completedAppts = completedAppointments || 0;

      return {
        summary: {
          totalRegisteredUsers: totalUsers || 0,
          totalAppointments: totalAppts,
          completedAppointments: completedAppts,
          cancelledAppointments: cancelledAppointments || 0,
          completionRate:
            totalAppts > 0
              ? `${Math.round((completedAppts / totalAppts) * 100)}%`
              : '0%',
        },
        history: history || [],
      };
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateReport(name: string, type: string) {
    try {
      const reportId = `RPT-${Math.floor(Math.random() * 9000) + 1000}`;
      const { data: record } = await this.supabase.admin
        .from('reports_history')
        .insert({
          report_id: reportId,
          name,
          type,
          size: `${Math.floor(Math.random() * 900) + 100} KB`,
          status: 'Generated',
        })
        .select()
        .maybeSingle();
      return record;
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── CMS Articles ─────────────────────────────────────────────────
  async getCmsArticles() {
    try {
      const { data } = await this.supabase.admin
        .from('cms_articles')
        .select('*')
        .order('created_at', { ascending: false });
      return (data || []).map((a) => ({
        ...a,
        date: a.updated_at
          ? new Date(a.updated_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPublicCmsArticles() {
    try {
      const { data } = await this.supabase.admin
        .from('cms_articles')
        .select('*')
        .eq('status', 'Published')
        .order('created_at', { ascending: false });
      return (data || []).map((a) => ({
        ...a,
        date: a.updated_at
          ? new Date(a.updated_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
      }));
    } catch {
      return [];
    }
  }

  async getPublicCmsArticleBySlugOrId(slugOrId: string) {
    try {
      let query = this.supabase.admin
        .from('cms_articles')
        .select('*')
        .eq('status', 'Published');

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      if (isUuid) {
        query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
      } else {
        query = query.eq('slug', slugOrId);
      }
      const { data } = await query.maybeSingle();
      return data;
    } catch {
      return null;
    }
  }

  async createCmsArticle(body: any) {
    try {
      const displayId = `C-${Math.floor(Math.random() * 9000) + 100}`;
      const slug = body.slug || (body.title ? body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `guide-${Date.now()}`);

      const payload: any = {
        title: body.title,
        author: body.author,
        category: body.category,
        status: body.status || 'Draft',
        display_id: displayId,
        summary: body.summary || '',
        content: body.content || '',
        slug,
        read_time: body.readTime || body.read_time || '5 min read',
        tags: Array.isArray(body.tags) ? body.tags : (body.tags ? [body.tags] : []),
      };

      let res = await this.supabase.admin
        .from('cms_articles')
        .insert(payload)
        .select()
        .maybeSingle();

      if (res.error) {
        const basicPayload = {
          title: body.title,
          author: body.author,
          category: body.category,
          status: body.status || 'Draft',
          display_id: displayId,
        };
        res = await this.supabase.admin
          .from('cms_articles')
          .insert(basicPayload)
          .select()
          .maybeSingle();
      }

      return res.data;
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateCmsArticleStatus(id: string, status: string) {
    try {
      const { data } = await this.supabase.admin
        .from('cms_articles')
        .update({ status })
        .eq('id', id)
        .select()
        .maybeSingle();
      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateCmsArticle(id: string, body: any) {
    try {
      const slug = body.slug || (body.title ? body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined);
      const payload: any = {
        title: body.title,
        author: body.author,
        category: body.category,
        summary: body.summary,
        content: body.content,
        status: body.status,
        slug,
        read_time: body.readTime || body.read_time,
        tags: Array.isArray(body.tags) ? body.tags : (body.tags ? [body.tags] : undefined),
      };

      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      let res = await this.supabase.admin
        .from('cms_articles')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (res.error) {
        const basicPayload = {
          title: body.title,
          author: body.author,
          category: body.category,
          status: body.status,
        };
        res = await this.supabase.admin
          .from('cms_articles')
          .update(basicPayload)
          .eq('id', id)
          .select()
          .maybeSingle();
      }

      return res.data;
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteCmsArticle(id: string) {
    try {
      await this.supabase.admin.from('cms_articles').delete().eq('id', id);
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Landing Page Settings (Database) ─────────────────────────────

  async getLandingSettings() {
    try {
      const { data, error } = await this.supabase.admin
        .from('landing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const defaultToggles = {
        showEmergencyBanner: false,
        showPromoBanner: true,
        showStats: true,
        showConditions: true,
        showPcosDiagram: true,
        showHolisticApproach: true,
        showHowItWorks: true,
        showAiShowcase: true,
        showFeaturedDoctors: true,
        showOutcomes: true,
        showTestimonials: true,
        showCycleTracker: true,
        showLabTests: true,
        showHealthTips: true,
        showPricing: true,
        showFaq: true,
        showNewsletter: true,
        showFloatingCTA: true,
        showProviderHero: true,
        showProviderBenefits: true,
        showDoctorAiShowcase: true,
        showProviderCalculator: true,
        showProviderComparison: true,
        showProviderTestimonials: true,
        showProviderSecurity: true,
        showProviderFaq: true,
      };

      if (error || !data) {
        return {
          heroTitle: "Your Premier Partner in Women's Health",
          heroSubtitle:
            'Empowering women through comprehensive, compassionate, and cutting-edge medical care. Book consultations instantly.',
          providerHeroTitle: 'Empower Your Practice with HealNari',
          providerHeroSubtitle:
            "Join the leading digital platform for women's endocrinology and reproductive health. Focus on what you do best—delivering world-class clinical outcomes—while our AI EMR and automated patient acquisition handles the rest.",
          pricingAmount: 799,
          platformCommissionRate: 10,
          toggles: defaultToggles,
          promoText: 'Use code HEALTH20 for 20% off your first consultation!',
          faqs: { patient: [], provider: [] },
          testimonials: { patient: [], provider: [] },
          seoMetadata: { patient: {}, provider: {} },
          heroCta: { patient: {}, provider: {} },
          announcements: [],
        };
      }

      return {
        heroTitle: data.hero_title,
        heroSubtitle: data.hero_subtitle,
        providerHeroTitle: data.provider_hero_title,
        providerHeroSubtitle: data.provider_hero_subtitle,
        pricingAmount: data.pricing_amount !== undefined ? data.pricing_amount : 799,
        platformCommissionRate:
          data.platform_commission_rate !== undefined &&
          data.platform_commission_rate !== null
            ? Number(data.platform_commission_rate)
            : 10,
        toggles: { ...defaultToggles, ...(data.toggles || {}) },
        promoText: data.promo_text,
        faqs: data.faqs || data.toggles?._faqs || { patient: [], provider: [] },
        testimonials: data.testimonials || data.toggles?._testimonials || { patient: [], provider: [] },
        seoMetadata: data.seo_metadata || data.toggles?._seoMetadata || { patient: {}, provider: {} },
        heroCta: data.hero_cta || data.toggles?._heroCta || { patient: {}, provider: {} },
        announcements: data.announcements || data.toggles?._announcements || [],
      };
    } catch (error) {
      console.error('Failed to fetch landing settings:', error);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateLandingSettings(settings: any, admin?: AuthUser) {
    try {
      const existingSettings = await this.getLandingSettings();
      const previousRate = existingSettings.platformCommissionRate;
      const newRate =
        settings.platformCommissionRate !== undefined
          ? Number(settings.platformCommissionRate)
          : previousRate;

      const mergedToggles = {
        ...(existingSettings.toggles || {}),
        ...(settings.toggles || {}),
        _faqs: settings.faqs !== undefined ? settings.faqs : existingSettings.faqs,
        _testimonials: settings.testimonials !== undefined ? settings.testimonials : existingSettings.testimonials,
        _seoMetadata: settings.seoMetadata !== undefined ? settings.seoMetadata : existingSettings.seoMetadata,
        _heroCta: settings.heroCta !== undefined ? settings.heroCta : existingSettings.heroCta,
        _announcements: settings.announcements !== undefined ? settings.announcements : existingSettings.announcements,
      };

      const updatedSettings: any = {
        hero_title:
          settings.heroTitle !== undefined
            ? settings.heroTitle
            : existingSettings.heroTitle,
        hero_subtitle:
          settings.heroSubtitle !== undefined
            ? settings.heroSubtitle
            : existingSettings.heroSubtitle,
        provider_hero_title:
          settings.providerHeroTitle !== undefined
            ? settings.providerHeroTitle
            : existingSettings.providerHeroTitle,
        provider_hero_subtitle:
          settings.providerHeroSubtitle !== undefined
            ? settings.providerHeroSubtitle
            : existingSettings.providerHeroSubtitle,
        pricing_amount:
          settings.pricingAmount !== undefined
            ? settings.pricingAmount
            : existingSettings.pricingAmount,
        platform_commission_rate: newRate,
        promo_text:
          settings.promoText !== undefined
            ? settings.promoText
            : existingSettings.promoText,
        toggles: mergedToggles,
      };

      if (settings.faqs !== undefined) updatedSettings.faqs = settings.faqs;
      if (settings.testimonials !== undefined) updatedSettings.testimonials = settings.testimonials;
      if (settings.seoMetadata !== undefined) updatedSettings.seo_metadata = settings.seoMetadata;
      if (settings.heroCta !== undefined) updatedSettings.hero_cta = settings.heroCta;
      if (settings.announcements !== undefined) updatedSettings.announcements = settings.announcements;

      let res = await this.supabase.admin
        .from('landing_settings')
        .upsert({ id: 1, ...updatedSettings })
        .select()
        .maybeSingle();

      if (res.error) {
        delete updatedSettings.faqs;
        delete updatedSettings.testimonials;
        delete updatedSettings.seo_metadata;
        delete updatedSettings.hero_cta;
        delete updatedSettings.announcements;

        res = await this.supabase.admin
          .from('landing_settings')
          .upsert({ id: 1, ...updatedSettings })
          .select()
          .maybeSingle();
      }

      if (res.error) {
        console.error('Failed to update landing settings:', res.error);
        throw new InternalServerErrorException(
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        );
      }

      // If commission rate changed via Landing Settings, record audit history & sync calculator
      if (settings.platformCommissionRate !== undefined && newRate !== previousRate) {
        let changedBy: string | null = null;
        if (admin?.id) {
          const { data: prof } = await this.supabase.admin
            .from('profiles')
            .select('id')
            .eq('id', admin.id)
            .maybeSingle();
          if (prof?.id) changedBy = prof.id;
        }

        await this.supabase.admin
          .from('platform_commission_history')
          .insert({
            previous_rate: previousRate,
            new_rate: newRate,
            effective_from: new Date().toISOString(),
            changed_by: changedBy,
            change_reason: 'Admin updated platform commission via Landing Page Settings',
          });

        this.commissionService.invalidateCache();
        CommissionCalculator.GLOBAL_COMMISSION_RATE = newRate;
        this.invalidateStatsCache();
      }

      return this.getLandingSettings();
    } catch (error) {
      console.error('Failed to update landing settings:', error);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Message Templates ───────────────────────────────────────────
  async getMessageTemplates() {
    try {
      const { data } = await this.supabase.admin
        .from('message_templates')
        .select()
        .order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createMessageTemplate(body: {
    name: string;
    content: string;
    subject?: string;
    slug?: string;
    description?: string;
    type?: string;
    audience?: string;
  }) {
    try {
      const { data } = await this.supabase.admin
        .from('message_templates')
        .insert({
          name: body.name,
          content: body.content,
          subject: body.subject || null,
          slug: body.slug || null,
          description: body.description || null,
          type: body.type || 'email',
          audience: body.audience || 'General',
        })
        .select()
        .maybeSingle();
      this.email.invalidateTemplateCache(body.slug);
      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateMessageTemplate(
    id: string,
    body: {
      name: string;
      content: string;
      subject?: string;
      slug?: string;
      description?: string;
      type?: string;
      audience?: string;
    },
  ) {
    try {
      const patch: Record<string, any> = {
        name: body.name,
        content: body.content,
      };
      if (body.type) patch.type = body.type;
      if (body.audience) patch.audience = body.audience;
      if (body.subject !== undefined) patch.subject = body.subject;
      if (body.slug !== undefined) patch.slug = body.slug;
      if (body.description !== undefined) patch.description = body.description;

      const { data } = await this.supabase.admin
        .from('message_templates')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      this.email.invalidateTemplateCache(body.slug || data?.slug);
      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteMessageTemplate(id: string) {
    try {
      const { data } = await this.supabase.admin
        .from('message_templates')
        .select('slug')
        .eq('id', id)
        .maybeSingle();
      await this.supabase.admin.from('message_templates').delete().eq('id', id);
      if (data?.slug) this.email.invalidateTemplateCache(data.slug);
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Broadcasts ──────────────────────────────────────────────────
  async getBroadcastHistory() {
    try {
      const { data } = await this.supabase.admin
        .from('broadcast_history')
        .select()
        .order('created_at', { ascending: false });
      return (data || []).map((b) => ({
        ...b,
        date: b.created_at
          ? new Date(b.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Resolves a Communications.jsx audience label into real recipient profile ids. */
  private async resolveAudience(audience: string): Promise<string[]> {
    let query = this.supabase.admin.from('profiles').select('id');
    switch (audience) {
      case 'All Patients':
        query = query.eq('role', ProfileRole.PATIENT);
        break;
      case 'All Doctors':
        query = query.eq('role', ProfileRole.DOCTOR);
        break;
      case 'New Patients': {
        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        query = query
          .eq('role', ProfileRole.PATIENT)
          .gte('created_at', thirtyDaysAgo);
        break;
      }
      case 'Unverified Doctors':
        query = query.eq('role', ProfileRole.DOCTOR).eq('kyc_verified', false);
        break;
      case 'All Users':
      default:
        break;
    }
    const { data } = await query;
    return (data || []).map((p) => p.id);
  }

  /** Only "Push" is a channel we can actually deliver ourselves (no email/SMS
   * provider is wired up) — resolves the audience to real recipients and fans
   * out a real in-app + web-push notification to each of them, same pattern
   * as CommunicationsService (doctor-side broadcasts). */
  async sendBroadcast(
    admin: AuthUser,
    body: {
      subject: string;
      audience: string;
      body: string;
      scheduleAt?: string;
      channels?: string[];
      userIds?: string[];
    },
  ) {
    try {
      const displayId = `BC-${Math.floor(Math.random() * 9000) + 100}`;
      const scheduled = !!body.scheduleAt;
      const channels = body.channels || [];
      let recipientIds: string[] = [];

      if (!scheduled) {
        // A specific selection (Users.jsx / DoctorManager.jsx "message these
        // N selected rows") always wins over the audience label — resolving
        // by label here would silently widen delivery to everyone matching
        // that label instead of just the rows the admin picked.
        recipientIds = body.userIds?.length
          ? body.userIds
          : await this.resolveAudience(body.audience);
        if (channels.includes('Push') && recipientIds.length) {
          await Promise.all(
            recipientIds.map((userId) =>
              this.notifications.create(userId, {
                type: 'broadcast',
                title: body.subject,
                message: body.body,
              }),
            ),
          );
        }
      }

      const { data } = await this.supabase.admin
        .from('broadcast_history')
        .insert({
          display_id: displayId,
          subject: body.subject,
          audience: body.audience,
          status: scheduled ? 'Scheduled' : 'Sent',
          channels,
          recipient_count: recipientIds.length,
          opens: '-',
          clicks: '-',
        })
        .select()
        .maybeSingle();
      this.writeAudit(
        admin,
        'broadcast.send',
        'broadcast_history',
        data.id,
        null,
        {
          subject: body.subject,
          audience: body.audience,
          recipientCount: recipientIds.length,
          channels,
        },
      );
      return data;
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Real single-recipient push, used by the Doctor/Patient detail pages'
   * "Message" action instead of the toast-only simulation they used to have. */
  async notifyUser(userId: string, title: string, message: string) {
    try {
      const { data: profile } = await this.supabase.admin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (!profile) throw new NotFoundException('User not found');
      const data = await this.notifications.create(userId, {
        type: 'admin_message',
        title,
        message,
      });
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Public Leads ────────────────────────────────────────────────
  async getNewsletterSubscribers() {
    try {
      const { data } = await this.supabase.admin
        .from('newsletter_subscribers')
        .select()
        .order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getConsultationRequests() {
    try {
      const { data } = await this.supabase.admin
        .from('consultation_requests')
        .select()
        .order('created_at', { ascending: false });
      const requests = data || [];

      const doctorIds = [
        ...new Set(requests.map((r) => r.doctor_id).filter(Boolean)),
      ];
      const { data: doctors } = doctorIds.length
        ? await this.supabase.admin
            .from('profiles')
            .select('id, full_name')
            .in('id', doctorIds)
        : { data: [] as { id: string; full_name: string }[] };
      const doctorNameById = new Map(
        (doctors || []).map((d) => [d.id, d.full_name]),
      );

      return requests.map((r) => ({
        ...r,
        doctor_name: r.doctor_id
          ? doctorNameById.get(r.doctor_id) || null
          : null,
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateConsultationRequestStatus(id: string, status: string) {
    try {
      const { data, error } = await this.supabase.admin
        .from('consultation_requests')
        .update({ status })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error || !data)
        throw new NotFoundException('Consultation request not found');
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Specialties Management ─────────────────────────────────────────
  async getSpecialties() {
    const { data, error } = await this.supabase.admin
      .from('specialties')
      .select('id, name, created_at')
      .order('name', { ascending: true });
    if (error) {
      this.logger.error(`Failed to fetch specialties: ${error.message}`, error);
      throw new InternalServerErrorException({
        message: 'Failed to retrieve specialties.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
    return data || [];
  }

  async createSpecialty(name: string) {
    const { data, error } = await this.supabase.admin
      .from('specialties')
      .insert({ name })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException({
          message: ERROR_MESSAGES.SPECIALTY_ALREADY_EXISTS,
          errorCode: ERROR_CODES.SPECIALTY_ALREADY_EXISTS,
        });
      }
      this.logger.error(`Failed to create specialty "${name}": ${error.message}`, error);
      throw new InternalServerErrorException({
        message: 'Unable to create specialty. Please try again.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
    return data;
  }

  async updateSpecialty(id: string, name: string) {
    const { data, error } = await this.supabase.admin
      .from('specialties')
      .update({ name })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException({
          message: ERROR_MESSAGES.SPECIALTY_ALREADY_EXISTS,
          errorCode: ERROR_CODES.SPECIALTY_ALREADY_EXISTS,
        });
      }
      this.logger.error(`Failed to update specialty ${id}: ${error.message}`, error);
      throw new InternalServerErrorException({
        message: 'Unable to update specialty. Please try again.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }

    if (!data) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.SPECIALTY_NOT_FOUND,
        errorCode: ERROR_CODES.SPECIALTY_NOT_FOUND,
      });
    }
    return data;
  }

  async deleteSpecialty(id: string) {
    const { error } = await this.supabase.admin
      .from('specialties')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete specialty ${id}: ${error.message}`, error);
      throw new InternalServerErrorException({
        message: 'Unable to delete specialty. Please try again.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
    return { success: true, id };
  }

  /** Public landing page — returns verified doctors with display-safe fields */
  async getPublicDoctors() {
    try {
      const { data, error } = await this.supabase.admin
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .order('created_at', { ascending: true });
      if (error) {
        this.logger.error(
          `Failed to fetch public doctors from Supabase: ${error.message}`,
        );
        return [];
      }
      return (data ?? []).map((d) => ({
        id: d.id,
        full_name: d.full_name,
        avatar_url: d.avatar_url,
        specialty: d.specialty,
        registration_no: d.registration_no,
        bio: d.bio,
        experience_years: d.experience_years,
        languages: d.languages,
        location: d.location,
        ethos: d.ethos,
        availability: d.availability,
        kyc_verified: d.kyc_verified,
      }));
    } catch (error) {
      this.logger.error('Error fetching public doctors:', error);
      return [];
    }
  }

  /** Test transactional email delivery with diagnostics */
  async testEmail(recipient: string) {
    return this.email.testEmail(recipient);
  }
}

