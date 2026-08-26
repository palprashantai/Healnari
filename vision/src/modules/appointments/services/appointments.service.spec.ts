import { ConflictException } from '@nestjs/common';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { createSupabaseMock } from '@/test-utils/supabase-mock';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

/**
 * AUDIT_REPORT.md OPS-1 — this is the "two patients book the same slot"
 * guarantee. The real guarantee is a Postgres unique index
 * (appointments_no_double_booking, migration 0020) that only a genuine
 * concurrent-write test against a live database can prove — no amount of
 * mocking two requests against the same in-memory object reproduces an
 * actual database race, so faking that here would be a test that always
 * passes regardless of whether the real constraint is even applied (see
 * DB-4 — it currently isn't, live). What IS meaningfully unit-testable
 * without a real database is the one thing the application layer is
 * actually responsible for: translating Postgres' 23505 conflict error
 * into a clean 409 instead of a raw DB error reaching the client.
 *
 * A true concurrency test lives in appointments.concurrency.e2e-spec.ts,
 * gated behind TEST_DATABASE_URL so it only runs where a real database is
 * available (CI/staging), never as part of the default `npm test`.
 */
describe('AppointmentsService.create — double-booking conflict handling', () => {
  const patient: AuthUser = {
    id: 'patient-1',
    email: 'p@x.com',
    profile: { role: ProfileRole.PATIENT } as any,
  };
  const doctorProfile = {
    id: 'doctor-1',
    role: ProfileRole.DOCTOR,
    kyc_verified: true,
    specialty: 'Gynecology',
  };
  const notifications = { create: jest.fn().mockResolvedValue(null) };
  const ai = {};

  const body = {
    doctorId: 'doctor-1',
    type: 'video',
    scheduledDate: '2099-01-01',
    scheduledTime: '10:00 AM',
  } as any;

  const email = {
    sendTemplatedMail: jest.fn().mockResolvedValue({ success: true }),
  };

  it('translates a 23505 unique-violation into a ConflictException, not a raw DB error', async () => {
    const { supabase } = createSupabaseMock({
      profiles: [{ data: doctorProfile }],
      appointments: [
        {
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        },
      ],
    });
    const service = new AppointmentsService(
      supabase as any,
      notifications as any,
      ai as any,
      email as any,
    );

    await expect(service.create(patient, body)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rethrows a non-conflict DB error as-is rather than swallowing it', async () => {
    const dbError = { code: '42501', message: 'permission denied' };
    const { supabase } = createSupabaseMock({
      profiles: [{ data: doctorProfile }],
      appointments: [{ data: null, error: dbError }],
    });
    const service = new AppointmentsService(
      supabase as any,
      notifications as any,
      ai as any,
      email as any,
    );

    await expect(service.create(patient, body)).rejects.toBe(dbError);
  });

  it('succeeds and notifies the doctor when no conflict occurs', async () => {
    const savedAppointment = {
      id: 'apt-1',
      patient_id: 'patient-1',
      doctor_id: 'doctor-1',
      type: 'video',
      scheduled_date: '2099-01-01',
      scheduled_time: '10:00 AM',
      status: 'Requested',
    };
    const { supabase } = createSupabaseMock({
      profiles: [
        { data: doctorProfile },
        {
          data: [
            { id: 'patient-1', full_name: 'Priya' },
            { id: 'doctor-1', full_name: 'Dr. Rao' },
          ],
        },
      ],
      appointments: [{ data: savedAppointment, error: null }],
    });
    const service = new AppointmentsService(
      supabase as any,
      notifications as any,
      ai as any,
      email as any,
    );

    const result = await service.create(patient, body);
    expect(result.id).toBe('apt-1');
    expect(notifications.create).toHaveBeenCalledWith(
      'doctor-1',
      expect.objectContaining({ type: 'appointment_requested' }),
    );
  });
});
