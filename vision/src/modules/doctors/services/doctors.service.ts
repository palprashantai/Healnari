import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

const STATIC_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM', '5:30 PM'];

@Injectable()
export class DoctorsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  private requireVerifiedDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified) throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
  }

  async search(q?: string, specialty?: string) {
    // Public directory — only ever surface admin-verified doctors, matching
    // what patients are told they're browsing.
    let query = this.supabase.admin.from('profiles').select().eq('role', ProfileRole.DOCTOR).eq('kyc_verified', true);

    if (specialty) {
      query = query.eq('specialty', specialty);
    }
    if (q) {
      query = query.ilike('full_name', `%${q}%`);
    }
    
    query = query.order('full_name', { ascending: true });
    const { data } = await query;
    return data || [];
  }

  /** Records that the doctor has submitted KYC for admin review. Does NOT
   * grant verified status itself — only an admin approval via
   * AdminService.updateDoctorVerification() can set kyc_verified = true.
   * (Previously this flipped kyc_verified straight to true, letting any
   * self-registered account grant itself full doctor access on demand.) */
  async verifyKyc(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (user.profile.kyc_verified) return user.profile;

    const { data: updated } = await this.supabase.admin.from('profiles').update({
      kyc_submitted_at: new Date().toISOString(),
    }).eq('id', user.id).select().single();

    if (!updated) throw new NotFoundException();
    return updated;
  }

  async getAnalytics(user: AuthUser) {
    this.requireVerifiedDoctor(user);
    const doctorId = user.id;

    const [{ data: appointments }, { data: payments }] = await Promise.all([
      this.supabase.admin.from('appointments').select('patient_id, type, status, scheduled_date').eq('doctor_id', doctorId),
      this.supabase.admin.from('payments').select('amount, created_at, status, method').eq('doctor_id', doctorId).eq('status', 'Paid'),
    ]);

    const apts = appointments || [];
    const pays = payments || [];

    // Revenue by month (last 12 months, oldest first)
    const revenueByMonth = new Map<string, number>();
    pays.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(p.amount));
    });
    const consultsByMonth = new Map<string, number>();
    apts.forEach((a) => {
      const d = new Date(a.scheduled_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      consultsByMonth.set(key, (consultsByMonth.get(key) || 0) + 1);
    });
    const now = new Date();
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        month: d.toLocaleString('en-US', { month: 'short' }),
        revenue: revenueByMonth.get(key) || 0,
        consultations: consultsByMonth.get(key) || 0,
      };
    });

    // Consultation delivery mode split
    const consultTypeSplit = {
      video: apts.filter((a) => a.type === 'video').length,
      clinic: apts.filter((a) => a.type === 'clinic').length,
    };

    // Weekly appointment load (Mon-first)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyLoadMap = new Map<string, number>(dayNames.map((d) => [d, 0]));
    apts.forEach((a) => {
      const day = dayNames[new Date(a.scheduled_date).getDay()];
      weeklyLoadMap.set(day, (weeklyLoadMap.get(day) || 0) + 1);
    });
    const weeklyLoad = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({ day, consultations: weeklyLoadMap.get(day) || 0 }));

    // No-show rate
    const totalAppointments = apts.length;
    const noShows = apts.filter((a) => a.status === 'No Show').length;
    const noShowRate = totalAppointments ? Number(((noShows / totalAppointments) * 100).toFixed(1)) : 0;

    // Patient age demographics + top chronic conditions, from patients this doctor has actually seen
    const patientIds = [...new Set(apts.map((a) => a.patient_id))];
    const { data: records } = patientIds.length
      ? await this.supabase.admin.from('patient_records').select('patient_id, dob, chronic_conditions').in('patient_id', patientIds)
      : { data: [] as { patient_id: string; dob: string | null; chronic_conditions: string[] }[] };

    const ageBuckets: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    const diagnosisCounts = new Map<string, number>();
    (records || []).forEach((r) => {
      if (r.dob) {
        const age = Math.floor((Date.now() - new Date(r.dob).getTime()) / 31557600000);
        if (age <= 25) ageBuckets['18-25']++;
        else if (age <= 35) ageBuckets['26-35']++;
        else if (age <= 45) ageBuckets['36-45']++;
        else if (age <= 55) ageBuckets['46-55']++;
        else ageBuckets['56+']++;
      }
      (r.chronic_conditions || []).forEach((c) => diagnosisCounts.set(c, (diagnosisCounts.get(c) || 0) + 1));
    });
    const topDiagnoses = [...diagnosisCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([condition, count]) => ({ condition, count }));

    // Appointment status split
    const appointmentStatusSplit = {
      Completed: apts.filter((a) => a.status === 'Done').length,
      Scheduled: apts.filter((a) => ['Upcoming', 'Waiting'].includes(a.status)).length,
      Cancelled: apts.filter((a) => a.status === 'Cancelled').length,
      NoShow: noShows,
    };

    // Payment method split (revenue by method)
    const paymentMethodSplit = {
      UPI: pays.filter((p) => p.method === 'UPI').reduce((sum, p) => sum + Number(p.amount), 0),
      Card: pays.filter((p) => p.method === 'Card').reduce((sum, p) => sum + Number(p.amount), 0),
      Cash: pays.filter((p) => p.method === 'Cash').reduce((sum, p) => sum + Number(p.amount), 0),
    };

    return {
      totalRevenue: pays.reduce((sum, p) => sum + Number(p.amount), 0),
      totalConsultations: totalAppointments,
      totalPatients: patientIds.length,
      noShowRate,
      monthlyTrend,
      consultTypeSplit,
      weeklyLoad,
      ageDemographics: Object.entries(ageBuckets).map(([age, count]) => ({ age, count })),
      topDiagnoses,
      appointmentStatusSplit,
      paymentMethodSplit,
    };
  }

  async getAvailableSlots(doctorId: string, date: string) {
    const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', doctorId).eq('role', ProfileRole.DOCTOR).single();
    if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

    const { data: booked } = await this.supabase.admin
      .from('appointments')
      .select('scheduled_time')
      .eq('doctor_id', doctorId)
      .eq('scheduled_date', date)
      .not('status', 'in', '("Cancelled","No Show")');

    const bookedTimes = new Set((booked || []).map((b) => b.scheduled_time));
    const availableSlots = STATIC_SLOTS.filter((slot) => !bookedTimes.has(slot));
    return { doctorId, date, availableSlots };
  }
}
