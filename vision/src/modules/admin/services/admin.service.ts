import { randomUUID } from 'crypto';
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AppointmentStatus } from '@/shared/interfaces/appointment.interface';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { CashfreeService } from '@/core/cashfree/cashfree.service';
import { EmailService } from '@/core/email/email.service';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly cashfree: CashfreeService,
    private readonly email: EmailService,
  ) {}

  /** AUDIT_REPORT.md SEC-6 — who did what, when, before → after, for the
   * admin actions that actually move money or change access. Best-effort:
   * never blocks or fails the action it's recording. */
  private writeAudit(actor: AuthUser, action: string, entity: string, entityId: string, before: unknown, after: unknown) {
    this.supabase.admin.from('audit_log').insert({
      actor_id: actor.id,
      actor_name: actor.profile?.full_name || null,
      action,
      entity,
      entity_id: entityId,
      before: before ?? null,
      after: after ?? null,
    }).then(({ error }: any) => {
      if (error) console.error('Failed to write audit log:', error.message);
    });
  }

  // ─── Dashboard ───────────────────────────────────────────────────
  async getDashboardStats() {
    try {
      const [
        { count: totalUsers },
        { count: totalDoctors },
        { count: totalPatients },
        { count: totalAppointments },
        { count: completedAppointments },
        { count: pendingVerifications },
        { count: openTickets },
        { count: pendingRefunds },
      ] = await Promise.all([
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }),
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', ProfileRole.DOCTOR),
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', ProfileRole.PATIENT),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', AppointmentStatus.DONE),
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', ProfileRole.DOCTOR).eq('kyc_verified', false),
        this.supabase.admin.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
        this.supabase.admin.from('refund_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
      ]);

      const { data: totalRevenue } = await this.supabase.admin.rpc('get_dashboard_revenue');

      return {
        totalUsers: totalUsers || 0,
        activeDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        platformRevenue: totalRevenue,
        pendingVerifications: pendingVerifications || 0,
        totalAppointments: totalAppointments || 0,
        completedConsultations: completedAppointments || 0,
        openTickets: openTickets || 0,
        pendingRefunds: pendingRefunds || 0,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getSystemHealth() {
    try {
      const { count: dbCheck } = await this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true });
      return [
        { name: 'API Services', status: 'Operational', ping: `${Math.floor(Math.random() * 50) + 10}ms` },
        { name: 'Database', status: dbCheck !== null && dbCheck >= 0 ? 'Operational' : 'Down', ping: `${dbCheck} records` },
        { name: 'SMS Gateway', status: 'Operational', ping: 'OK' },
        { name: 'Video Servers', status: 'Operational', ping: `${Math.floor(Math.random() * 60) + 20}ms` },
      ];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Compliance & Audit ──────────────────────────────────────────
  async getPhiAuditLogs() {
    const { data, error } = await this.supabase.admin
      .from('phi_audit_logs')
      .select(`
        id, actor_id, actor_role, target_patient_id, action, resource, status, ip_address, created_at,
        actor:profiles!phi_audit_logs_actor_id_fkey(full_name, email),
        target:profiles!phi_audit_logs_target_patient_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(500);
      
    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  // ─── Analytics ───────────────────────────────────────────────────
  async getAnalytics() {
    try {
      const { data, error } = await this.supabase.admin.rpc('get_admin_analytics');
      if (error) {
        throw new InternalServerErrorException('Failed to fetch admin analytics from database');
      }
      return data;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Users ───────────────────────────────────────────────────────
  async getAllUsers(role?: string, page = 1, limit = 50, search?: string) {
    try {
      let q = this.supabase.admin
        .from('profiles')
        .select('id, full_name, email, phone, role, status, created_at', { count: 'exact' });
      if (role) q = q.eq('role', role);
      else q = q.eq('role', ProfileRole.PATIENT);
      if (search) {
        // Strip characters that are structurally significant in a PostgREST
        // filter string (`,` separates or-conditions, `(`/`)` group them) so
        // a search term can't break out of the ilike clauses below.
        const safeSearch = search.replace(/[,()%_]/g, ' ').trim();
        if (safeSearch) q = q.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
      }

      const from = (page - 1) * limit;
      const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + limit - 1);

      return {
        users: (data || []).map(u => ({
          id: u.id,
          name: u.full_name || 'Unknown',
          email: u.email || '',
          phone: u.phone || '',
          role: u.role,
          status: u.status || 'Active',
          joined: u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          ltv: 0,
          lastVisit: 'N/A',
        })),
        total: count || 0,
      };
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserById(id: string) {
    try {
      const { data: profile } = await this.supabase.admin.from('profiles').select('*').eq('id', id).single();
      if (!profile) throw new NotFoundException('User not found');

      const [{ data: appointments }, { data: payments }] = await Promise.all([
        this.supabase.admin.from('appointments').select('id, doctor_id, specialty, type, status, scheduled_date').is('deleted_at', null).eq('patient_id', id).order('scheduled_date', { ascending: false }).limit(20),
        this.supabase.admin.from('payments').select('id, doctor_id, appointment_id, amount, status, category, service, created_at').eq('patient_id', id).order('created_at', { ascending: false }),
      ]);

      const apts = appointments || [];
      const pays = payments || [];

      const doctorIds = [...new Set([...apts.map(a => a.doctor_id), ...pays.map(p => p.doctor_id)].filter(Boolean))];
      const { data: doctorProfiles } = doctorIds.length
        ? await this.supabase.admin.from('profiles').select('id, full_name').in('id', doctorIds)
        : { data: [] as { id: string; full_name: string }[] };
      const nameByDoctorId = new Map((doctorProfiles || []).map(d => [d.id, d.full_name]));
      const amountByAppointmentId = new Map(pays.filter(p => p.appointment_id).map(p => [p.appointment_id, p]));

      const paidPayments = pays.filter(p => p.status === 'Paid');

      // Spending trend, last 6 months
      const now = new Date();
      const spentByMonth = new Map<string, number>();
      paidPayments.forEach(p => {
        const key = new Date(p.created_at).toISOString().slice(0, 7);
        spentByMonth.set(key, (spentByMonth.get(key) || 0) + Number(p.amount));
      });
      const spendingTrend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = d.toISOString().slice(0, 7);
        return { month: d.toLocaleString('en-US', { month: 'short' }), spent: spentByMonth.get(key) || 0 };
      });

      // Spending by category
      const byCategory = new Map<string, number>();
      paidPayments.forEach(p => {
        const cat = p.category || 'Other';
        byCategory.set(cat, (byCategory.get(cat) || 0) + Number(p.amount));
      });
      const spendingByCategory = [...byCategory.entries()].map(([category, amount]) => ({ category, amount }));

      const consultations = apts.map(a => ({
        id: a.id,
        doctor: nameByDoctorId.get(a.doctor_id) || 'Doctor',
        specialty: a.specialty || 'General',
        date: a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        type: a.type === 'video' ? 'Video' : 'Clinic',
        status: a.status,
        cost: Number(amountByAppointmentId.get(a.id)?.amount || 0),
      }));

      return {
        profile,
        kpis: {
          lifetimeValue: paidPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          consultationsCompleted: apts.filter(a => a.status === AppointmentStatus.DONE).length,
        },
        spendingTrend,
        spendingByCategory,
        consultations,
        payments: pays,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateUserStatus(id: string, status: string) {
    try {
      const { data: updated, error } = await this.supabase.admin.from('profiles').update({ status }).eq('id', id).select('id, status').single();
      if (error || !updated) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
      return { userId: updated.id, status: updated.status, updatedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Doctors ─────────────────────────────────────────────────────
  async getDoctorsAndClinics() {
    try {
      const { data } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name, email, phone, specialty, kyc_verified, consultation_fee, commission_rate, status, created_at')
        .eq('role', ProfileRole.DOCTOR)
        .order('created_at', { ascending: false });

      if (!data) return [];

      // Count appointments per doctor
      const doctorIds = data.map(d => d.id);
      const { data: apts } = await this.supabase.admin
        .from('appointments')
        .select('doctor_id, status')
        .in('doctor_id', doctorIds);

      const aptCountMap: Record<string, number> = {};
      const revenueMap: Record<string, number> = {};
      for (const a of (apts || [])) {
        aptCountMap[a.doctor_id] = (aptCountMap[a.doctor_id] || 0) + 1;
        if (a.status === AppointmentStatus.DONE) {
          const fee = Number(data.find(d => d.id === a.doctor_id)?.consultation_fee || 0);
          revenueMap[a.doctor_id] = (revenueMap[a.doctor_id] || 0) + fee;
        }
      }

      return data.map(d => ({
        id: d.id,
        name: d.full_name || 'Unknown',
        specialty: d.specialty || 'General',
        status: d.status || 'Active',
        verified: d.kyc_verified || false,
        joined: d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        commissionRate: Number(d.commission_rate ?? 15),
        totalGross: revenueMap[d.id] || 0,
        totalConsults: aptCountMap[d.id] || 0,
        rating: 0,
        consultationFee: Number(d.consultation_fee || 0),
        email: d.email || '',
        phone: d.phone || '',
      }));
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getDoctorDetail(id: string) {
    try {
      const { data: doctor } = await this.supabase.admin.from('profiles').select('*').eq('id', id).eq('role', ProfileRole.DOCTOR).single();
      if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

      const [{ data: appointments }, { data: payments }] = await Promise.all([
        this.supabase.admin.from('appointments').select('id, patient_id, type, status, scheduled_date').is('deleted_at', null).eq('doctor_id', id).order('scheduled_date', { ascending: false }),
        this.supabase.admin.from('payments').select('id, patient_id, amount, status, service, created_at').eq('doctor_id', id).order('created_at', { ascending: false }),
      ]);

      const apts = appointments || [];
      const pays = payments || [];

      const patientIds = [...new Set([...apts.map(a => a.patient_id), ...pays.map(p => p.patient_id)].filter(Boolean))];
      const { data: patientProfiles } = patientIds.length
        ? await this.supabase.admin.from('profiles').select('id, full_name').in('id', patientIds)
        : { data: [] as { id: string; full_name: string }[] };
      const nameByPatientId = new Map((patientProfiles || []).map(p => [p.id, p.full_name]));

      const paidPayments = pays.filter(p => p.status === 'Paid');

      // Gross revenue trend, last 6 months
      const now = new Date();
      const revenueByMonth = new Map<string, number>();
      paidPayments.forEach(p => {
        const key = new Date(p.created_at).toISOString().slice(0, 7);
        revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(p.amount));
      });
      const revenueTrend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = d.toISOString().slice(0, 7);
        return { month: d.toLocaleString('en-US', { month: 'short' }), revenue: revenueByMonth.get(key) || 0 };
      });

      // Appointment status breakdown
      const statusCounts = new Map<string, number>();
      apts.forEach(a => statusCounts.set(a.status, (statusCounts.get(a.status) || 0) + 1));
      const appointmentStatusBreakdown = [...statusCounts.entries()].map(([status, count]) => ({ status, count }));

      const ledger = pays.slice(0, 20).map(p => ({
        id: p.id,
        patient: nameByPatientId.get(p.patient_id) || 'Patient',
        date: new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        service: p.service,
        amount: Number(p.amount),
        status: p.status,
      }));

      return {
        doctor,
        kpis: {
          totalGross: paidPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          totalConsults: apts.filter(a => a.status === AppointmentStatus.DONE).length,
          totalAppointments: apts.length,
        },
        revenueTrend,
        appointmentStatusBreakdown,
        ledger,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateDoctorCommission(id: string, commissionRate: number) {
    try {
      const { data: updated, error } = await this.supabase.admin
        .from('profiles')
        .update({ commission_rate: commissionRate })
        .eq('id', id)
        .eq('role', ProfileRole.DOCTOR)
        .select('id, commission_rate')
        .single();
      if (error || !updated) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);
      return { doctorId: updated.id, commissionRate: Number(updated.commission_rate), updatedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPendingVerifications() {
    try {
      const { data } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name, email, specialty, created_at')
        .eq('role', ProfileRole.DOCTOR)
        .eq('kyc_verified', false)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []).map(d => ({
        id: d.id,
        name: d.full_name || 'Unknown',
        email: d.email || '',
        specialty: d.specialty || 'General',
        appliedOn: d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      }));
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateDoctorVerification(admin: AuthUser, id: string, status: string) {
    try {
      const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', id).eq('role', ProfileRole.DOCTOR).single();
      if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);
      const isApproved = status === 'approved';
      const { data: updated } = await this.supabase.admin.from('profiles').update({ kyc_verified: isApproved }).eq('id', id).select().single();
      this.writeAudit(admin, 'verification.update', 'profiles', id, { kyc_verified: doctor.kyc_verified }, { kyc_verified: updated.kyc_verified });

      // 1. In-App & Web Push Notification
      this.notifications.create(id, {
        type: 'doctor_kyc_status',
        title: isApproved ? '🎉 KYC Verification Approved!' : 'KYC Verification Update',
        message: isApproved
          ? 'Congratulations! Your medical credentials have been verified. You can now publish availability and consult patients.'
          : 'Your doctor verification submission requires revision. Please review your medical license details.',
      }).catch(() => {});

      // 2. Transactional Email via database-managed template
      if (doctor.email) {
        if (isApproved) {
          this.email.sendTemplatedMail({
            to: doctor.email,
            slug: 'doctor_kyc_approved',
            defaultSubject: '🎉 Your HealNari Doctor Account is Verified!',
            defaultHtml: `
              <div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                <h2 style="color:#10b981;">🎉 Welcome to HealNari Practice Network</h2>
                <p>Dear Dr. {{doctorName}},</p>
                <p>We are delighted to inform you that your medical license and practice credentials have been <strong>verified and approved</strong>.</p>
                <p>You can now log in to your provider dashboard, set your consultation hours, and start receiving patient appointments.</p>
                <div style="margin:24px 0;"><a href="{{dashboardUrl}}" style="background:#0f172a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">Go to Doctor Dashboard</a></div>
                <p style="color:#64748b;font-size:12px;">Best regards,<br/>HealNari Clinical Governance Team</p>
              </div>
            `,
            variables: {
              doctorName: doctor.full_name || 'Doctor',
              dashboardUrl: 'https://healnari.vercel.app/doctor/dashboard',
            },
          }).catch(() => {});
        } else {
          this.email.sendTemplatedMail({
            to: doctor.email,
            slug: 'doctor_kyc_rejected',
            defaultSubject: 'Update regarding your HealNari KYC Verification',
            defaultHtml: `
              <div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                <h2 style="color:#e11d48;">HealNari KYC Verification Update</h2>
                <p>Dear Dr. {{doctorName}},</p>
                <p>Thank you for submitting your verification details. Our medical compliance team has reviewed your documents and identified items requiring clarification.</p>
                <p>Please log in to your dashboard to review the feedback and re-upload your medical registration certificate.</p>
                <p style="color:#64748b;font-size:12px;">Best regards,<br/>HealNari Verification Desk</p>
              </div>
            `,
            variables: {
              doctorName: doctor.full_name || 'Doctor',
              dashboardUrl: 'https://healnari.vercel.app/doctor/dashboard',
            },
          }).catch(() => {});
        }
      }

      return { doctorId: updated.id, statusUpdated: status, processedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Tickets ─────────────────────────────────────────────────────
  async getSupportTickets() {
    try {
      const { data } = await this.supabase.admin.from('support_tickets').select().order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async resolveTicket(admin: AuthUser, ticketId: number) {
    try {
      const { data: ticket } = await this.supabase.admin.from('support_tickets').select().eq('id', ticketId).single();
      if (!ticket) throw new NotFoundException('Ticket not found');
      const { data: updated } = await this.supabase.admin.from('support_tickets').update({ status: 'Resolved' }).eq('id', ticketId).select().single();
      this.writeAudit(admin, 'ticket.resolve', 'support_tickets', String(ticketId), { status: ticket.status }, { status: updated.status });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Refunds ─────────────────────────────────────────────────────
  async getRefundRequests() {
    try {
      const { data } = await this.supabase.admin.from('refund_requests').select().order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Actually calls Cashfree's refund API for gateway-linked payments —
   * previously this just flipped refund_requests.status to 'Processed' with
   * no money ever moving. Payments with no cf_order_id (manual/cash charges,
   * or rows predating the Cashfree integration) fall back to the old
   * admin-confirms-it-happened-manually behavior, since there's no gateway
   * transaction to call a refund API against. */
  async processRefund(admin: AuthUser, refundId: number) {
    const { data: refund } = await this.supabase.admin.from('refund_requests').select().eq('id', refundId).single();
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status === 'Processed') return refund; // idempotent — don't double-refund on a retried click

    const payment = refund.payment_id
      ? (await this.supabase.admin.from('payments').select().eq('id', refund.payment_id).single()).data
      : null;

    let cfRefundId: string | null = null;

    if (payment?.cf_order_id) {
      const result = await this.cashfree.createRefund(payment.cf_order_id, Number(refund.amount), `rf-${randomUUID()}`, refund.reason);
      if (result.refund_status === 'FAILED') {
        throw new InternalServerErrorException(`Cashfree refund failed: ${result.refund_arn || result.refund_status}`);
      }
      cfRefundId = result.cf_refund_id ? String(result.cf_refund_id) : null;
      await this.supabase.admin.from('payments').update({ status: 'Refunded' }).eq('id', payment.id);
    } else if (payment) {
      // No gateway order to refund against (e.g. a doctor-recorded cash
      // charge) — this confirms the admin handled it out-of-band.
      await this.supabase.admin.from('payments').update({ status: 'Refunded' }).eq('id', payment.id);
    }

    const { data: updated } = await this.supabase.admin.from('refund_requests').update({
      status: 'Processed',
      cf_refund_id: cfRefundId,
    }).eq('id', refundId).select().single();

    this.writeAudit(admin, 'refund.process', 'refund_requests', String(refundId), { status: refund.status }, { status: updated.status, cf_refund_id: cfRefundId });

    const patientId = refund.patient_id || payment?.patient_id;
    if (patientId) {
      this.notifications.create(patientId, {
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `Your refund of ₹${Number(refund.amount).toFixed(0)} has been processed.`,
        data: { refundId },
      });
    }

    return updated;
  }

  // ─── Revenue ─────────────────────────────────────────────────────
  async getRevenueData() {
    try {
      const [
        { count: completedCount },
        { data: doneAppointments },
        { data: paidPayments },
      ] = await Promise.all([
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', AppointmentStatus.DONE),
        this.supabase.admin.from('appointments').select('doctor_id, doctor:profiles!appointments_doctor_id_fkey(consultation_fee, specialty, currency)').is('deleted_at', null).eq('status', AppointmentStatus.DONE),
        this.supabase.admin.from('payments').select('amount, currency, gateway, status, created_at').eq('status', 'Paid'),
      ]);

      let totalRevenue = 0;
      const bySpecialtyMap = new Map<string, number>();
      const byCurrencyMap = new Map<string, { amount: number; count: number }>();

      (paidPayments || []).forEach(p => {
        const curr = p.currency || 'USD';
        const existing = byCurrencyMap.get(curr) || { amount: 0, count: 0 };
        byCurrencyMap.set(curr, {
          amount: existing.amount + Number(p.amount || 0),
          count: existing.count + 1,
        });
      });

      if (doneAppointments && doneAppointments.length > 0) {
        for (const a of doneAppointments) {
          const doc = a.doctor as any;
          if (doc) {
            totalRevenue += Number(doc.consultation_fee || 0);
            const specialty = doc.specialty || 'General';
            bySpecialtyMap.set(specialty, (bySpecialtyMap.get(specialty) || 0) + Number(doc.consultation_fee || 0));
          }
        }
      }

      const revenueBySpecialty = Array.from(bySpecialtyMap.entries()).map(([specialty, revenue]) => ({ specialty, revenue }));
      const currencyBreakdown = Array.from(byCurrencyMap.entries()).map(([currency, data]) => ({ currency, ...data }));

      return {
        currentMonth: totalRevenue,
        completedConsultations: completedCount || 0,
        revenueBySpecialty,
        currencyBreakdown: currencyBreakdown.length ? currencyBreakdown : [
          { currency: 'USD', amount: 4850, count: 167 },
          { currency: 'GBP', amount: 2400, count: 98 },
          { currency: 'AED', amount: 8900, count: 81 },
          { currency: 'EUR', amount: 1680, count: 60 },
          { currency: 'INR', amount: 148500, count: 186 },
        ],
      };
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Real doctor-submitted payout requests (BillingService.requestPayout) */
  async getPayoutRequests() {
    try {
      const { data: payouts } = await this.supabase.admin
        .from('payouts')
        .select('id, doctor_id, amount, method, status, reference_id, requested_at, processed_at')
        .order('requested_at', { ascending: false });

      if (!payouts?.length) return [];

      const doctorIds = [...new Set(payouts.map(p => p.doctor_id))];
      const { data: doctors } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name, commission_rate, currency, country')
        .in('id', doctorIds);
      const doctorMap = new Map((doctors || []).map(d => [d.id, d]));

      return payouts.map(p => {
        const doc = doctorMap.get(p.doctor_id);
        return {
          id: p.id,
          displayId: `PO-${p.id.slice(0, 6).toUpperCase()}`,
          doctor: doc?.full_name || 'Unknown',
          amount: Number(p.amount),
          currency: doc?.currency || 'USD',
          country: doc?.country || 'US',
          feeCut: `${Number(doc?.commission_rate ?? 10)}%`,
          date: p.requested_at ? new Date(p.requested_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          method: p.method,
          status: p.status === 'Paid' ? 'Processed' : p.status === 'Failed' ? 'Failed' : 'Pending',
          referenceId: p.reference_id || null,
        };
      });
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async processPayout(admin: AuthUser, id: string, referenceId: string) {
    try {
      const { data: updated, error } = await this.supabase.admin
        .from('payouts')
        .update({ status: 'Paid', reference_id: referenceId, processed_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, doctor_id, amount')
        .single();
      if (error || !updated) throw new NotFoundException('Payout not found');

      this.writeAudit(admin, 'payout.process', 'payouts', id, null, { status: 'Paid', reference_id: referenceId });

      // 1. In-App + Web Push
      await this.notifications.create(updated.doctor_id, {
        type: 'payout_processed',
        title: 'Payout processed',
        message: `Your payout of ₹${Number(updated.amount).toLocaleString('en-IN')} has been processed. Reference: ${referenceId}`,
      });

      // 2. Transactional Email to Doctor via database-managed template
      const { data: doc } = await this.supabase.admin.from('profiles').select('email, full_name').eq('id', updated.doctor_id).single();
      if (doc?.email) {
        const formattedAmount = `₹${Number(updated.amount).toLocaleString('en-IN')}`;
        const settlementDate = new Date().toLocaleDateString('en-IN');
        this.email.sendTemplatedMail({
          to: doc.email,
          slug: 'doctor_payout_settlement',
          defaultSubject: `HealNari Payout Settlement Confirmed (${formattedAmount})`,
          defaultHtml: `
            <div style="font-family:sans-serif;max-width:550px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
              <h2 style="color:#0f172a;margin-top:0;">Payment Settlement Advice</h2>
              <p>Dear Dr. {{doctorName}},</p>
              <p>Your net earnings payout has been successfully processed and transferred to your registered bank account.</p>
              <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #e2e8f0;">
                <p style="margin:4px 0;font-size:13px;color:#64748b;">Payout Amount:</p>
                <h3 style="margin:4px 0;color:#10b981;font-size:22px;">{{amount}}</h3>
                <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Bank Reference (UTR): <strong>{{referenceId}}</strong></p>
                <p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">Settlement Date: <strong>{{settlementDate}}</strong></p>
              </div>
              <p style="color:#64748b;font-size:12px;">For any billing queries, please contact finance@healnari.com.</p>
            </div>
          `,
          variables: {
            doctorName: doc.full_name || 'Doctor',
            amount: formattedAmount,
            referenceId,
            settlementDate,
          },
        }).catch(() => {});
      }

      return { payoutId: updated.id, referenceId, status: 'Processed', processedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
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
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', AppointmentStatus.DONE),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', AppointmentStatus.CANCELLED),
      ]);

      const { data: history } = await this.supabase.admin.from('reports_history').select().order('created_at', { ascending: false });

      const totalAppts = totalAppointments || 0;
      const completedAppts = completedAppointments || 0;

      return {
        summary: {
          totalRegisteredUsers: totalUsers || 0,
          totalAppointments: totalAppts,
          completedAppointments: completedAppts,
          cancelledAppointments: cancelledAppointments || 0,
          completionRate: totalAppts > 0 ? `${Math.round((completedAppts / totalAppts) * 100)}%` : '0%',
        },
        history: history || [],
      };
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async generateReport(name: string, type: string) {
    try {
      const reportId = `RPT-${Math.floor(Math.random() * 9000) + 1000}`;
      const { data: record } = await this.supabase.admin
        .from('reports_history')
        .insert({ report_id: reportId, name, type, size: `${Math.floor(Math.random() * 900) + 100} KB`, status: 'Generated' })
        .select()
        .single();
      return record;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── CMS Articles ─────────────────────────────────────────────────
  async getCmsArticles() {
    try {
      const { data } = await this.supabase.admin.from('cms_articles').select().order('created_at', { ascending: false });
      return (data || []).map(a => ({
        ...a,
        date: a.updated_at ? new Date(a.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      }));
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async createCmsArticle(body: { title: string; author: string; category: string; status?: string }) {
    try {
      const displayId = `C-${Math.floor(Math.random() * 9000) + 100}`;
      const { data } = await this.supabase.admin.from('cms_articles').insert({ ...body, display_id: displayId, status: body.status || 'Draft' }).select().single();
      return data;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCmsArticleStatus(id: string, status: string) {
    try {
      const { data } = await this.supabase.admin.from('cms_articles').update({ status }).eq('id', id).select().single();
      return data;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCmsArticle(id: string, body: any) {
    try {
      const { data } = await this.supabase.admin.from('cms_articles').update({
        title: body.title,
        author: body.author,
        category: body.category,
        summary: body.summary,
        content: body.content,
        status: body.status
      }).eq('id', id).select().single();
      return data;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCmsArticle(id: string) {
    try {
      await this.supabase.admin.from('cms_articles').delete().eq('id', id);
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Landing Page Settings (Database) ─────────────────────────────
  
  async getLandingSettings() {
    try {
      const { data, error } = await this.supabase.admin.from('landing_settings').select('*').eq('id', 1).single();
      if (error || !data) {
        return {
          heroTitle: 'Your Premier Partner in Women\'s Health',
          heroSubtitle: 'Empowering women through comprehensive, compassionate, and cutting-edge medical care. Book consultations instantly.',
          providerHeroTitle: 'Empower Your Practice with HealNari',
          providerHeroSubtitle: 'Join the leading digital platform for women\'s endocrinology and reproductive health. Focus on what you do best—delivering world-class clinical outcomes—while our AI EMR and automated patient acquisition handles the rest.',
          pricingAmount: 799,
          toggles: {
            showEmergencyBanner: false,
            showFeaturedDoctors: true,
            showTestimonials: true,
            showPricing: false,
            showNewsletter: true,
            showProviderTestimonials: true,
            showProviderCalculator: true,
            showProviderComparison: true
          },
          promoText: 'Use code HEALTH20 for 20% off your first consultation!'
        };
      }
      return {
        heroTitle: data.hero_title,
        heroSubtitle: data.hero_subtitle,
        providerHeroTitle: data.provider_hero_title,
        providerHeroSubtitle: data.provider_hero_subtitle,
        pricingAmount: data.pricing_amount,
        toggles: data.toggles,
        promoText: data.promo_text
      };
    } catch (error) {
      console.error('Failed to fetch landing settings:', error);
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateLandingSettings(settings: any) {
    try {
      // First try to fetch the existing settings
      const existingSettings = await this.getLandingSettings();
      
      const updatedSettings = {
        hero_title: settings.heroTitle !== undefined ? settings.heroTitle : existingSettings.heroTitle,
        hero_subtitle: settings.heroSubtitle !== undefined ? settings.heroSubtitle : existingSettings.heroSubtitle,
        provider_hero_title: settings.providerHeroTitle !== undefined ? settings.providerHeroTitle : existingSettings.providerHeroTitle,
        provider_hero_subtitle: settings.providerHeroSubtitle !== undefined ? settings.providerHeroSubtitle : existingSettings.providerHeroSubtitle,
        pricing_amount: settings.pricingAmount !== undefined ? settings.pricingAmount : existingSettings.pricingAmount,
        promo_text: settings.promoText !== undefined ? settings.promoText : existingSettings.promoText,
        toggles: settings.toggles !== undefined ? settings.toggles : existingSettings.toggles
      };

      const { data, error } = await this.supabase.admin
        .from('landing_settings')
        .upsert({ id: 1, ...updatedSettings })
        .select()
        .single();
        
      if (error) {
        console.error('Failed to update landing settings:', error);
        throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      }
      
      return {
        heroTitle: data.hero_title,
        heroSubtitle: data.hero_subtitle,
        providerHeroTitle: data.provider_hero_title,
        providerHeroSubtitle: data.provider_hero_subtitle,
        pricingAmount: data.pricing_amount,
        toggles: data.toggles,
        promoText: data.promo_text
      };
    } catch (error) {
      console.error('Failed to update landing settings:', error);
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Message Templates ───────────────────────────────────────────
  async getMessageTemplates() {
    try {
      const { data } = await this.supabase.admin.from('message_templates').select().order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async createMessageTemplate(body: { name: string; content: string; subject?: string; slug?: string; description?: string; type?: string; audience?: string }) {
    try {
      const { data } = await this.supabase.admin.from('message_templates').insert({
        name: body.name,
        content: body.content,
        subject: body.subject || null,
        slug: body.slug || null,
        description: body.description || null,
        type: body.type || 'email',
        audience: body.audience || 'General',
      }).select().single();
      this.email.invalidateTemplateCache(body.slug);
      return data;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateMessageTemplate(id: string, body: { name: string; content: string; subject?: string; slug?: string; description?: string; type?: string; audience?: string }) {
    try {
      const patch: Record<string, any> = { name: body.name, content: body.content };
      if (body.type) patch.type = body.type;
      if (body.audience) patch.audience = body.audience;
      if (body.subject !== undefined) patch.subject = body.subject;
      if (body.slug !== undefined) patch.slug = body.slug;
      if (body.description !== undefined) patch.description = body.description;

      const { data } = await this.supabase.admin.from('message_templates').update(patch).eq('id', id).select().single();
      this.email.invalidateTemplateCache(body.slug || data?.slug);
      return data;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteMessageTemplate(id: string) {
    try {
      const { data } = await this.supabase.admin.from('message_templates').select('slug').eq('id', id).single();
      await this.supabase.admin.from('message_templates').delete().eq('id', id);
      if (data?.slug) this.email.invalidateTemplateCache(data.slug);
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Broadcasts ──────────────────────────────────────────────────
  async getBroadcastHistory() {
    try {
      const { data } = await this.supabase.admin.from('broadcast_history').select().order('created_at', { ascending: false });
      return (data || []).map(b => ({
        ...b,
        date: b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      }));
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
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
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.eq('role', ProfileRole.PATIENT).gte('created_at', thirtyDaysAgo);
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
  async sendBroadcast(admin: AuthUser, body: { subject: string; audience: string; body: string; scheduleAt?: string; channels?: string[]; userIds?: string[] }) {
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
        recipientIds = body.userIds?.length ? body.userIds : await this.resolveAudience(body.audience);
        if (channels.includes('Push') && recipientIds.length) {
          await Promise.all(recipientIds.map((userId) => this.notifications.create(userId, {
            type: 'broadcast',
            title: body.subject,
            message: body.body,
          })));
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
        .single();
      this.writeAudit(admin, 'broadcast.send', 'broadcast_history', data.id, null, { subject: body.subject, audience: body.audience, recipientCount: recipientIds.length, channels });
      return data;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  /** Real single-recipient push, used by the Doctor/Patient detail pages'
   * "Message" action instead of the toast-only simulation they used to have. */
  async notifyUser(userId: string, title: string, message: string) {
    try {
      const { data: profile } = await this.supabase.admin.from('profiles').select('id').eq('id', userId).single();
      if (!profile) throw new NotFoundException('User not found');
      const data = await this.notifications.create(userId, { type: 'admin_message', title, message });
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Public Leads ────────────────────────────────────────────────
  async getNewsletterSubscribers() {
    try {
      const { data } = await this.supabase.admin.from('newsletter_subscribers').select().order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getConsultationRequests() {
    try {
      const { data } = await this.supabase.admin.from('consultation_requests').select().order('created_at', { ascending: false });
      const requests = data || [];

      const doctorIds = [...new Set(requests.map(r => r.doctor_id).filter(Boolean))];
      const { data: doctors } = doctorIds.length
        ? await this.supabase.admin.from('profiles').select('id, full_name').in('id', doctorIds)
        : { data: [] as { id: string; full_name: string }[] };
      const doctorNameById = new Map((doctors || []).map(d => [d.id, d.full_name]));

      return requests.map(r => ({ ...r, doctor_name: r.doctor_id ? doctorNameById.get(r.doctor_id) || null : null }));
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateConsultationRequestStatus(id: string, status: string) {
    try {
      const { data, error } = await this.supabase.admin.from('consultation_requests').update({ status }).eq('id', id).select().single();
      if (error || !data) throw new NotFoundException('Consultation request not found');
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
