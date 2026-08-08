import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { PayDto, RequestPayoutDto } from '@/modules/billing/controllers/billing.controller';

@Injectable()
export class BillingService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  private async withNames(payments: any[]) {
    if (!payments.length) return [];
    const ids = [...new Set(payments.flatMap(p => [p.patient_id, p.doctor_id]).filter(Boolean))];
    const { data: profiles } = await this.supabase.admin.from('profiles').select('id, full_name').in('id', ids);
    const nameById = new Map((profiles || []).map(p => [p.id, p.full_name]));
    return payments.map(p => ({
      ...p,
      patientName: nameById.get(p.patient_id) || 'Patient',
      doctorName: p.doctor_id ? (nameById.get(p.doctor_id) || 'Doctor') : null,
    }));
  }

  async getTransactions(user: AuthUser) {
    const col = user.profile.role === ProfileRole.DOCTOR ? 'doctor_id' : 'patient_id';
    const { data } = await this.supabase.admin.from('payments').select().eq(col, user.id).order('created_at', { ascending: false });
    return this.withNames(data || []);
  }

  async getTransaction(user: AuthUser, id: string) {
    const { data: payment } = await this.supabase.admin.from('payments').select().eq('id', id).single();
    if (!payment) throw new NotFoundException(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
    if (payment.patient_id !== user.id && payment.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return (await this.withNames([payment]))[0];
  }

  async getEarningsSummary(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: paid } = await this.supabase.admin.from('payments').select('amount, created_at').eq('doctor_id', user.id).eq('status', 'Paid');
    const { data: pending } = await this.supabase.admin.from('payments').select('amount').eq('doctor_id', user.id).eq('status', 'Pending');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const sum = (rows: any[]) => rows.reduce((total, r) => total + Number(r.amount), 0);
    const rows = paid || [];

    return {
      thisMonth: sum(rows.filter(r => new Date(r.created_at) >= startOfMonth)),
      thisMonthCount: rows.filter(r => new Date(r.created_at) >= startOfMonth).length,
      lastMonth: sum(rows.filter(r => new Date(r.created_at) >= startOfLastMonth && new Date(r.created_at) < startOfMonth)),
      lastMonthCount: rows.filter(r => new Date(r.created_at) >= startOfLastMonth && new Date(r.created_at) < startOfMonth).length,
      pending: sum(pending || []),
      pendingCount: (pending || []).length,
      totalYtd: sum(rows.filter(r => new Date(r.created_at) >= startOfYear)),
    };
  }

  async pay(user: AuthUser, body: PayDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: appointment } = await this.supabase.admin.from('appointments').select().eq('id', body.appointmentId).eq('patient_id', user.id).single();
    if (!appointment) throw new NotFoundException(ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);

    const { data: doctor } = await this.supabase.admin.from('profiles').select('consultation_fee').eq('id', appointment.doctor_id).single();
    const amount = Number(doctor?.consultation_fee || 0);

    const { data: existing } = await this.supabase.admin.from('payments').select().eq('appointment_id', appointment.id).eq('status', 'Pending').single();

    const txnRef = `TXN-${Math.floor(Math.random() * 900000 + 100000)}`;
    if (existing) {
      const { data: updated } = await this.supabase.admin.from('payments').update({ status: 'Paid', method: body.method, txn_ref: txnRef }).eq('id', existing.id).select().single();
      return (await this.withNames([updated]))[0];
    }

    const { data: created } = await this.supabase.admin.from('payments').insert({
      patient_id: user.id,
      doctor_id: appointment.doctor_id,
      appointment_id: appointment.id,
      service: appointment.type === 'video' ? 'Video Consult' : 'Clinic Visit',
      category: appointment.specialty,
      amount,
      status: 'Paid',
      method: body.method,
      txn_ref: txnRef,
    }).select().single();
    return (await this.withNames([created]))[0];
  }

  async getPayouts(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data } = await this.supabase.admin.from('payouts').select().eq('doctor_id', user.id).order('requested_at', { ascending: false });
    return data || [];
  }

  async requestPayout(user: AuthUser, body: RequestPayoutDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data } = await this.supabase.admin.from('payouts').insert({
      doctor_id: user.id,
      amount: body.amount,
      method: body.method,
      status: 'Processing',
    }).select().single();
    return data;
  }
}
