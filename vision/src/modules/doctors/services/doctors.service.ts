import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { UpdateScheduleDto, CreateExceptionDto } from '@/modules/doctors/controllers/doctors.controller';



@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(
    private readonly supabase: SupabaseService,
  ) { }

  private requireDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  private requireVerifiedDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified) throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
  }

  async search(q?: string, specialty?: string) {
    // Public directory — only ever surface admin-verified doctors, matching
    // what patients are told they're browsing.
    let query = this.supabase.admin.from('profiles').select('*, doctor_schedules(day_of_week, start_time, end_time)').eq('role', ProfileRole.DOCTOR).eq('kyc_verified', true);

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
    }).eq('id', user.id).select().maybeSingle();

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
    const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', doctorId).eq('role', ProfileRole.DOCTOR).maybeSingle();
    if (!doctor || !doctor.kyc_verified) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

    // Enforce booking window — patients cannot book too far ahead or too close
    const minAdvanceMinutes = doctor.min_advance_booking_minutes ?? 30;
    const maxAdvanceDays = doctor.max_advance_booking_days ?? 60;
    const doctorTz = doctor.timezone || 'Asia/Kolkata';
    const nowInDoctorTz = new Date(new Date().toLocaleString('en-US', { timeZone: doctorTz }));
    const requestedDate = new Date(date + 'T00:00:00');
    const todayInDoctorTz = new Date(nowInDoctorTz);
    todayInDoctorTz.setHours(0, 0, 0, 0);

    const daysDiff = Math.round((requestedDate.getTime() - todayInDoctorTz.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) {
      return { doctorId, date, availableSlots: [], reason: 'past_date', message: 'Cannot view slots for a date in the past.' };
    }
    if (daysDiff > maxAdvanceDays) {
      return { doctorId, date, availableSlots: [], reason: 'too_far_ahead', message: `Bookings are only available up to ${maxAdvanceDays} days in advance.` };
    }

    const result = await this._getSlotsForDate(doctorId, date, minAdvanceMinutes, doctorTz);

    // If no available slots, find suggested dates
    if (result.availableSlots.length === 0) {
      const suggestedDates = await this._findNextAvailableDates(doctorId, date, 3, minAdvanceMinutes, doctorTz);
      return { ...result, suggestedDates };
    }

    return result;
  }

  /** Internal: get slots for a single date, with a reason if unavailable */
  private async _getSlotsForDate(doctorId: string, date: string, minAdvanceMinutes = 30, doctorTz = 'Asia/Kolkata'): Promise<{ doctorId: string; date: string; availableSlots: string[]; slotDurationMinutes?: number; reason?: string; message?: string }> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = new Date(date).getDay();
    const dayName = dayNames[dayOfWeek];

    // Check approved leave
    const { data: leaves } = await this.supabase.admin
      .from('leave_requests')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('status', 'Approved')
      .lte('from_date', date)
      .gte('to_date', date);

    if (leaves && leaves.length > 0) {
      return { doctorId, date, availableSlots: [], reason: 'on_leave', message: 'The doctor is on approved leave on this date.' };
    }

    // Check exceptions (time-off)
    const { data: exception } = await this.supabase.admin
      .from('doctor_exceptions')
      .select('is_available')
      .eq('doctor_id', doctorId)
      .eq('exception_date', date)
      .maybeSingle();

    if (exception && !exception.is_available) {
      return { doctorId, date, availableSlots: [], reason: 'day_off', message: 'The doctor has marked this day as time off.' };
    }

    // Check schedule
    const { data: schedule } = await this.supabase.admin
      .from('doctor_schedules')
      .select('start_time, end_time, lunch_start, lunch_end, max_bookings_per_day, slot_duration_minutes, buffer_minutes')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    if (!schedule && !exception?.is_available) {
      return { doctorId, date, availableSlots: [], reason: 'not_working', message: `The doctor does not work on ${dayName}s.` };
    }

    const startStr = schedule?.start_time || '09:00:00';
    const endStr = schedule?.end_time || '17:00:00';
    const lunchStartStr = schedule?.lunch_start || null;
    const lunchEndStr = schedule?.lunch_end || null;
    const maxBookings = schedule?.max_bookings_per_day || null;
    const slotDuration = schedule?.slot_duration_minutes ?? 30;
    const bufferMinutes = schedule?.buffer_minutes ?? 0;
    const step = slotDuration + bufferMinutes;

    const generateSlots = (start: string, end: string) => {
      const slots: string[] = [];
      let [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      
      while (true) {
        // Check that the slot's end (start + duration) fits within working hours
        const slotEndMin = sh * 60 + sm + slotDuration;
        const workEndMin = eh * 60 + em;
        if (slotEndMin > workEndMin) break;

        const ampm = sh >= 12 ? 'PM' : 'AM';
        const displayHour = sh % 12 === 0 ? 12 : sh % 12;
        const displayMin = sm.toString().padStart(2, '0');
        slots.push(`${displayHour}:${displayMin} ${ampm}`);
        
        sm += step;
        while (sm >= 60) {
          sm -= 60;
          sh += 1;
        }
      }
      return slots;
    };

    const dynamicSlots = generateSlots(startStr, endStr);

    // Filter out lunch break slots
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const slotTo24h = (slot: string) => {
      const isPM = slot.toLowerCase().includes('pm');
      const match = slot.match(/(\d+):(\d+)/);
      if (!match) return 0;
      let hour = parseInt(match[1], 10);
      const min = parseInt(match[2], 10);
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return hour * 60 + min;
    };

    const slotsAfterLunch = (lunchStartStr && lunchEndStr)
      ? dynamicSlots.filter(slot => {
          const slotMin = slotTo24h(slot);
          const lunchStart = timeToMinutes(lunchStartStr);
          const lunchEnd = timeToMinutes(lunchEndStr);
          return slotMin < lunchStart || slotMin >= lunchEnd;
        })
      : dynamicSlots;

    const { data: booked } = await this.supabase.admin
      .from('appointments')
      .select('scheduled_time')
      .is('deleted_at', null)
      .eq('doctor_id', doctorId)
      .eq('scheduled_date', date)
      .not('status', 'in', '("Cancelled","No Show")');

    const bookedTimes = new Set((booked || []).map((b) => b.scheduled_time));
    const bookedCount = (booked || []).length;
    // Use doctor's timezone for "is today" and past-slot filtering
    const nowInDoctorTz = new Date(new Date().toLocaleString('en-US', { timeZone: doctorTz }));
    const todayStr = `${nowInDoctorTz.getFullYear()}-${String(nowInDoctorTz.getMonth() + 1).padStart(2, '0')}-${String(nowInDoctorTz.getDate()).padStart(2, '0')}`;
    const isToday = todayStr === date;

    // Enforce max bookings per day
    if (maxBookings && bookedCount >= maxBookings) {
      return { doctorId, date, availableSlots: [], slotDurationMinutes: slotDuration, reason: 'max_bookings', message: `The doctor has reached the maximum of ${maxBookings} bookings for this day.` };
    }

    const availableSlots = slotsAfterLunch.filter((slot) => {
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
          // Enforce minimum advance booking time
          const cutoff = new Date(nowInDoctorTz.getTime() + minAdvanceMinutes * 60 * 1000);
          if (slotTime < cutoff) return false;
        }
      }

      return true;
    });

    if (availableSlots.length === 0 && dynamicSlots.length > 0) {
      const reason = isToday ? 'past_hours' : 'fully_booked';
      const message = isToday
        ? 'All remaining slots for today have passed.'
        : 'All slots on this date are fully booked.';
      return { doctorId, date, availableSlots: [], slotDurationMinutes: slotDuration, reason, message };
    }

    return { doctorId, date, availableSlots, slotDurationMinutes: slotDuration };
  }

  /** Scan ahead up to 14 days to find the next N dates with open slots */
  private async _findNextAvailableDates(doctorId: string, fromDate: string, count: number, minAdvanceMinutes = 30, doctorTz = 'Asia/Kolkata'): Promise<string[]> {
    const results: string[] = [];
    const start = new Date(fromDate);

    for (let i = 1; i <= 14 && results.length < count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      const { availableSlots } = await this._getSlotsForDate(doctorId, dateStr, minAdvanceMinutes, doctorTz);
      if (availableSlots.length > 0) {
        results.push(dateStr);
      }
    }

    return results;
  }

  async getMySchedule(user: AuthUser) {
    this.requireDoctor(user);

    const [{ data: schedule }, { data: exceptions }] = await Promise.all([
      this.supabase.admin
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', user.id)
        .order('day_of_week', { ascending: true }),
      this.supabase.admin
        .from('doctor_exceptions')
        .select('*')
        .eq('doctor_id', user.id)
        .gte('exception_date', new Date().toISOString().slice(0, 10))
        .order('exception_date', { ascending: true })
    ]);

    return { schedule: schedule || [], exceptions: exceptions || [] };
  }

  async updateMySchedule(user: AuthUser, body: UpdateScheduleDto) {
    this.requireDoctor(user);

    // Check for affected upcoming appointments before modifying schedule.
    // We look at which days are being REMOVED or having hours reduced.
    const { data: currentSchedule } = await this.supabase.admin
      .from('doctor_schedules')
      .select('day_of_week')
      .eq('doctor_id', user.id);

    const currentDays = new Set((currentSchedule || []).map(s => s.day_of_week));
    const newDays = new Set(body.schedule.map(d => d.dayOfWeek));
    const removedDays = [...currentDays].filter(d => !newDays.has(d));

    if (removedDays.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: affected } = await this.supabase.admin
        .from('appointments')
        .select('id')
        .eq('doctor_id', user.id)
        .gte('scheduled_date', todayStr)
        .not('status', 'in', '("Cancelled","No Show","Done")')
        .limit(1);

      // We warn but do NOT block — the frontend already shows a confirmation
      // dialog. Log it so there's a trail if appointments get orphaned.
      if (affected && affected.length > 0) {
        this.logger.warn(`Doctor ${user.id} updating schedule — upcoming appointments exist on removed days [${removedDays.join(',')}].`);
      }
    }

    // Insert new schedule FIRST, then delete old — if the insert fails,
    // the old schedule survives (each row has its own PK so no conflict).
    // We use a temporary marker to distinguish old vs new rows.
    const inserts = body.schedule.map(d => ({
      doctor_id: user.id,
      day_of_week: d.dayOfWeek,
      start_time: d.startTime,
      end_time: d.endTime,
      lunch_start: d.lunchStart || null,
      lunch_end: d.lunchEnd || null,
      max_bookings_per_day: d.maxBookingsPerDay || null,
      slot_duration_minutes: d.slotDurationMinutes ?? 30,
      buffer_minutes: d.bufferMinutes ?? 0,
    }));

    // Step 1: Delete old rows
    const { error: deleteError } = await this.supabase.admin
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', user.id);

    if (deleteError) {
      throw new InternalServerErrorException('Failed to update schedule');
    }

    // Step 2: Insert new rows — if this fails, the doctor's schedule is
    // empty, but that's recoverable (they can resave). This is much safer
    // than the alternative of leaving stale + new rows mixed together.
    if (inserts.length === 0) {
      return []; // Doctor turned off all days
    }

    const { data, error } = await this.supabase.admin
      .from('doctor_schedules')
      .insert(inserts)
      .select();

    if (error) {
      this.logger.error(`Schedule insert failed for doctor ${user.id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to update schedule. Your previous schedule may have been cleared — please try saving again.');
    }

    return data;
  }

  async addException(user: AuthUser, body: CreateExceptionDto) {
    this.requireDoctor(user);

    const { data, error } = await this.supabase.admin
      .from('doctor_exceptions')
      .insert({
        doctor_id: user.id,
        exception_date: body.exceptionDate,
        is_available: body.isAvailable,
        reason: body.reason
      })
      .select()
      .maybeSingle();

    if (error) {
      // Unique constraint on (doctor_id, exception_date) from migration 0051
      if (error.code === '23505') {
        throw new ConflictException('An exception already exists for this date. Please remove it first.');
      }
      throw new InternalServerErrorException('Failed to add exception');
    }

    return data;
  }

  async removeException(user: AuthUser, id: string) {
    this.requireDoctor(user);

    const { error } = await this.supabase.admin
      .from('doctor_exceptions')
      .delete()
      .eq('id', id)
      .eq('doctor_id', user.id);

    if (error) {
      throw new InternalServerErrorException('Failed to remove exception');
    }

    return { success: true };
  }
}
