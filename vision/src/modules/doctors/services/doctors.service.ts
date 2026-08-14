import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

const STATIC_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM', '5:30 PM'];

@Injectable()
export class DoctorsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) { }

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

    const { data, error } = await this.supabase.admin.rpc('get_doctor_analytics', { p_doctor_id: doctorId });
    if (error) {
      throw new InternalServerErrorException('Failed to aggregate doctor analytics');
    }
    return data;
  }

  async getMyAuditLogs(user: AuthUser) {
    this.requireVerifiedDoctor(user);

    const { data, error } = await this.supabase.admin
      .from('phi_audit_logs')
      .select(`
        id, actor_id, actor_role, action, resource, status, ip_address, created_at,
        target:profiles!phi_audit_logs_target_patient_id_fkey(full_name)
      `)
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  async getAvailableSlots(doctorId: string, date: string) {
    const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', doctorId).eq('role', ProfileRole.DOCTOR).single();
    if (!doctor || !doctor.kyc_verified) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

    // If doctor is on approved leave on this date, no slots are available
    const { data: leaves } = await this.supabase.admin
      .from('leave_requests')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('status', 'Approved')
      .lte('from_date', date)
      .gte('to_date', date);

    if (leaves && leaves.length > 0) {
      return { doctorId, date, availableSlots: [] };
    }

    const { data: booked } = await this.supabase.admin
      .from('appointments')
      .select('scheduled_time')
      .is('deleted_at', null)
      .eq('doctor_id', doctorId)
      .eq('scheduled_date', date)
      .not('status', 'in', '("Cancelled","No Show")');

    const bookedTimes = new Set((booked || []).map((b) => b.scheduled_time));
    const now = new Date();
    const isToday = now.toISOString().slice(0, 10) === date;

    const availableSlots = STATIC_SLOTS.filter((slot) => {
      if (bookedTimes.has(slot)) return false;

      if (isToday) {
        const isPM = slot.toLowerCase().includes('pm');
        const timeMatches = slot.match(/(\d+):(\d+)/);
        if (timeMatches) {
          let hour = parseInt(timeMatches[1], 10);
          const min = parseInt(timeMatches[2], 10);
          if (isPM && hour < 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
          const slotTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
          if (slotTime < now) return false;
        }
      }

      return true;
    });

    return { doctorId, date, availableSlots };
  }
}
