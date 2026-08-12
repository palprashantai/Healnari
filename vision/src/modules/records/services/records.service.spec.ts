import { ForbiddenException } from '@nestjs/common';
import { RecordsService } from '@/modules/records/services/records.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { createSupabaseMock } from '@/test-utils/supabase-mock';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

/**
 * AUDIT_REPORT.md SEC-1 — the IDOR boundary. Any KYC-verified doctor used to
 * be able to reach any patient's records; the fix scopes access to a real
 * care relationship (an appointment, or having registered the patient as a
 * walk-in). These tests are the regression guard for that boundary,
 * exercised through getDocuments() — every other guardPatientAccess-gated
 * method (labs, vaccinations, emergency contacts) shares the exact same
 * check, so this one path stands in for all of them.
 */
describe('RecordsService — doctor/patient access boundary', () => {
  const notifications = { create: jest.fn() };
  const verifiedDoctor: AuthUser = { id: 'doctor-1', email: 'd@x.com', profile: { role: ProfileRole.DOCTOR, kyc_verified: true } as any };
  const unverifiedDoctor: AuthUser = { id: 'doctor-2', email: 'd2@x.com', profile: { role: ProfileRole.DOCTOR, kyc_verified: false } as any };
  const patient: AuthUser = { id: 'patient-1', email: 'p@x.com', profile: { role: ProfileRole.PATIENT } as any };

  it('rejects a doctor with no appointment and no walk-in registration for this patient', async () => {
    const { supabase } = createSupabaseMock({
      appointments: [{ count: 0 }],
      patient_records: [{ data: { created_by_doctor_id: 'some-other-doctor' } }],
    });
    const service = new RecordsService(supabase as any, notifications as any);

    await expect(service.getDocuments(verifiedDoctor, 'patient-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a doctor who has an appointment with this patient', async () => {
    const { supabase } = createSupabaseMock({
      appointments: [{ count: 1 }],
      patient_records: [{ data: null }],
      patient_documents: [{ data: [{ id: 'doc-1', patient_id: 'patient-1' }] }],
    });
    const service = new RecordsService(supabase as any, notifications as any);

    const docs = await service.getDocuments(verifiedDoctor, 'patient-1');
    expect(docs).toEqual([{ id: 'doc-1', patient_id: 'patient-1' }]);
  });

  it('allows the doctor who registered this patient as a walk-in, even with zero appointments', async () => {
    const { supabase } = createSupabaseMock({
      appointments: [{ count: 0 }],
      patient_records: [{ data: { created_by_doctor_id: 'doctor-1' } }],
      patient_documents: [{ data: [] }],
    });
    const service = new RecordsService(supabase as any, notifications as any);

    await expect(service.getDocuments(verifiedDoctor, 'patient-1')).resolves.toEqual([]);
  });

  it('rejects an unverified doctor outright, before any relationship check', async () => {
    const { supabase, from } = createSupabaseMock({});
    const service = new RecordsService(supabase as any, notifications as any);

    await expect(service.getDocuments(unverifiedDoctor, 'patient-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(from).not.toHaveBeenCalled();
  });

  it('lets a patient reach their own records without a relationship check', async () => {
    const { supabase, from } = createSupabaseMock({
      patient_documents: [{ data: [{ id: 'doc-1' }] }],
    });
    const service = new RecordsService(supabase as any, notifications as any);

    const docs = await service.getDocuments(patient, 'patient-1');
    expect(docs).toEqual([{ id: 'doc-1' }]);
    // Only the actual data fetch — no appointments/patient_records lookup,
    // confirming a patient's own-record path never touches the doctor check.
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('patient_documents');
  });

  it('blocks a patient from reaching another patient\'s records', async () => {
    const { supabase } = createSupabaseMock({});
    const service = new RecordsService(supabase as any, notifications as any);

    await expect(service.getDocuments(patient, 'someone-elses-id')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
