import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { createSupabaseMock } from '@/test-utils/supabase-mock';
import { ProfileRole } from '@/shared/interfaces/profile.interface';

describe('DoctorsService — Slots & Timezone Safety', () => {
  const verifiedDoctor = {
    id: 'doc-123',
    role: ProfileRole.DOCTOR,
    full_name: 'Dr. Sarah Jenkins',
    kyc_verified: true,
    timezone: 'Asia/Kolkata',
    min_advance_booking_minutes: 30,
    max_advance_booking_days: 36500, // allow future test dates
  };

  const mondayToFridaySchedule = {
    day_of_week: 2, // Tuesday
    start_time: '09:00:00',
    end_time: '12:00:00',
    lunch_start: '10:00:00',
    lunch_end: '10:30:00',
    slot_duration_minutes: 30,
    buffer_minutes: 0,
    max_bookings_per_day: 10,
  };

  it('correctly maps date to day of week without UTC rollover issues', async () => {
    // 2099-06-16 is a Tuesday (day_of_week = 2)
    const testDate = '2099-06-16';

    const { supabase } = createSupabaseMock({
      profiles: [{ data: verifiedDoctor }],
      leave_requests: [{ data: [] }],
      doctor_exceptions: [{ data: null }],
      doctor_schedules: [{ data: mondayToFridaySchedule }],
      appointments: [{ data: [] }],
    });

    const service = new DoctorsService(supabase as any);
    const result = await service.getAvailableSlots('doc-123', testDate);

    expect(result.availableSlots).toBeDefined();
    // 9:00 AM, 9:30 AM, (10:00-10:30 lunch skipped), 10:30 AM, 11:00 AM, 11:30 AM
    expect(result.availableSlots).toEqual([
      '9:00 AM',
      '9:30 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
    ]);
    expect(result.availableSlots).not.toContain('10:00 AM'); // Lunch break excluded
  });

  it('returns on_leave reason when doctor is on approved leave', async () => {
    const testDate = '2099-06-16';

    const { supabase } = createSupabaseMock({
      profiles: [{ data: verifiedDoctor }],
      leave_requests: [{ data: [{ id: 'leave-1' }] }],
    });

    const service = new DoctorsService(supabase as any);
    const result = await service.getAvailableSlots('doc-123', testDate);

    expect(result.availableSlots).toEqual([]);
    expect(result.reason).toBe('on_leave');
  });

  it('filters out already booked slots on the given date', async () => {
    const testDate = '2099-06-16';

    const { supabase } = createSupabaseMock({
      profiles: [{ data: verifiedDoctor }],
      leave_requests: [{ data: [] }],
      doctor_exceptions: [{ data: null }],
      doctor_schedules: [{ data: mondayToFridaySchedule }],
      appointments: [{ data: [{ scheduled_time: '9:00 AM' }] }],
    });

    const service = new DoctorsService(supabase as any);
    const result = await service.getAvailableSlots('doc-123', testDate);

    expect(result.availableSlots).not.toContain('9:00 AM');
    expect(result.availableSlots).toContain('9:30 AM');
  });
});
