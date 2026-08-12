import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import {
  AddDocumentDto,
  AddEmergencyContactDto,
  AddVaccinationDto,
  CreateClinicalNoteDto,
  CreatePrescriptionDto,
  RequestLabReportDto,
  ReviewLabReportDto,
  UploadLabReportDto,
} from '@/modules/records/controllers/records.controller';

const LAB_REPORTS_BUCKET = 'lab-reports';
const ALLOWED_LAB_REPORT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

@Injectable()
export class RecordsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Doctor role alone isn't enough to read/write other people's PHI — the
   * account must also be admin-verified (see DoctorsService.verifyKyc). */
  private requireVerifiedDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified) throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
  }

  async getPrescriptions(user: AuthUser) {
    const query = this.supabase.admin.from('prescriptions').select().order('created_at', { ascending: false });
    if (user.profile.role === ProfileRole.DOCTOR) {
      this.requireVerifiedDoctor(user);
      query.eq('doctor_id', user.id);
    } else {
      query.eq('patient_id', user.id);
    }
    const { data } = await query;
    return data || [];
  }

  /** Every medicine line from one "Write Prescription" submission is saved
   * together under a shared group_id, so the patient sees one prescription
   * with several medicines instead of N unrelated ones — see migration
   * 0017_prescription_grouping. */
  async createPrescription(user: AuthUser, body: CreatePrescriptionDto) {
    this.requireVerifiedDoctor(user);

    const { data: patient } = await this.supabase.admin.from('profiles').select().eq('id', body.patientId).eq('role', ProfileRole.PATIENT).single();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const groupId = randomUUID();
    const prescribedAt = new Date().toISOString().slice(0, 10);
    const rows = body.medicines.map((m) => ({
      patient_id: body.patientId,
      doctor_id: user.id,
      group_id: groupId,
      diagnosis: body.diagnosis,
      med_name: m.medName,
      dosage: m.dosage,
      schedule: m.schedule,
      duration: m.duration,
      instructions: body.instructions,
      prescribed_at: prescribedAt,
    }));

    const { data: prescriptions } = await this.supabase.admin.from('prescriptions').insert(rows).select();

    this.notifications.create(body.patientId, {
      type: 'prescription_issued',
      title: 'New prescription',
      message: `Dr. ${user.profile.full_name} issued a new prescription${body.diagnosis ? ` for ${body.diagnosis}` : ''} (${body.medicines.length} medicine${body.medicines.length > 1 ? 's' : ''}).`,
      data: { groupId },
    }).catch(() => {});

    return prescriptions;
  }

  async requestRefill(user: AuthUser, id: string) {
    const { data: rx } = await this.supabase.admin.from('prescriptions').select().eq('id', id).eq('patient_id', user.id).single();
    if (!rx) throw new NotFoundException(ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);
    
    const { data: updated } = await this.supabase.admin.from('prescriptions').update({ refill_requested: true }).eq('id', id).select().single();
    return updated;
  }

  async handleRefill(user: AuthUser, id: string, action: 'approve' | 'reject') {
    this.requireVerifiedDoctor(user);

    const { data: rx } = await this.supabase.admin.from('prescriptions').select().eq('id', id).single();
    if (!rx) throw new NotFoundException(ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);
    // Only the prescribing doctor may action a refill on their own line —
    // unassigned (legacy) prescriptions with no doctor_id remain open to any
    // verified doctor, matching prior behavior for those rows.
    if (rx.doctor_id && rx.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const patch: any = { refill_requested: false };
    if (action === 'approve') {
      patch.refills_left = rx.refills_left + 1;
      const validTill = new Date();
      validTill.setDate(validTill.getDate() + 90);
      patch.valid_till = validTill.toISOString().slice(0, 10);
    }

    const { data: updated } = await this.supabase.admin.from('prescriptions').update(patch).eq('id', id).select().single();
    return updated;
  }

  async getLabReports(user: AuthUser, patientId?: string) {
    // Patients are always scoped to themselves. A doctor may either scope to
    // one patient (the EMR tab's use case) or, same rule as PatientsService's
    // "any verified doctor sees every patient" — omit patientId to get their
    // full cross-patient review queue (Reports.jsx's use case).
    const scopedPatientId = user.profile.role === ProfileRole.PATIENT ? user.id : patientId;
    if (scopedPatientId) this.guardPatientAccess(user, scopedPatientId);
    else this.requireVerifiedDoctor(user);

    const query = this.supabase.admin.from('lab_reports').select().order('created_at', { ascending: false });
    if (scopedPatientId) query.eq('patient_id', scopedPatientId);
    const { data } = await query;
    return data || [];
  }

  async uploadLabReport(user: AuthUser, file: Express.Multer.File, body: UploadLabReportDto) {
    this.guardPatientAccess(user, body.patientId);

    if (!ALLOWED_LAB_REPORT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }

    let request: any = null;
    if (body.requestId) {
      const { data } = await this.supabase.admin.from('lab_report_requests').select().eq('id', body.requestId).single();
      if (!data || data.patient_id !== body.patientId) throw new NotFoundException(ERROR_MESSAGES.LAB_REPORT_REQUEST_NOT_FOUND);
      request = data;
    }

    const testName = body.testName || request?.requested_tests;
    if (!testName) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST);

    const ext = (file.originalname.split('.').pop() || 'pdf').toLowerCase();
    const sanitizedBase = file.originalname.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
    const path = `${body.patientId}/${randomUUID()}-${sanitizedBase}.${ext}`;

    const { error: uploadError } = await this.supabase.admin.storage
      .from(LAB_REPORTS_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw new BadRequestException(uploadError.message);

    const { data: report } = await this.supabase.admin.from('lab_reports').insert({
      patient_id: body.patientId,
      uploaded_by: user.id,
      test_category: body.testCategory || request?.requested_tests || null,
      test_name: testName,
      lab_name: body.labName,
      urgent: body.urgent ?? false,
      status: 'Uploaded',
      results: {},
      file_path: path,
      original_filename: file.originalname,
      file_type: file.mimetype,
      report_date: body.reportDate || null,
      notes: body.notes || null,
      request_id: body.requestId || null,
    }).select().single();

    if (request) {
      await this.supabase.admin.from('lab_report_requests').update({ status: 'Fulfilled' }).eq('id', request.id);
      this.notifications.create(request.doctor_id, {
        type: 'lab_report_uploaded',
        title: 'Lab report uploaded',
        message: `A new report for "${testName}" was uploaded.`,
        data: { labReportId: report.id, requestId: request.id },
      }).catch(() => {});
    }

    return report;
  }

  async getSignedUrl(user: AuthUser, id: string) {
    const { data: report } = await this.supabase.admin.from('lab_reports').select().eq('id', id).single();
    if (!report) throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);
    this.guardPatientAccess(user, report.patient_id);
    if (!report.file_path) throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);

    const { data, error } = await this.supabase.admin.storage.from(LAB_REPORTS_BUCKET).createSignedUrl(report.file_path, 3600);
    if (error || !data) throw new BadRequestException(error?.message || ERROR_MESSAGES.BAD_REQUEST);
    return { url: data.signedUrl, fileType: report.file_type, originalFilename: report.original_filename };
  }

  async deleteLabReport(user: AuthUser, id: string) {
    const { data: report } = await this.supabase.admin.from('lab_reports').select().eq('id', id).single();
    if (!report) throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);
    if (user.profile.role !== ProfileRole.PATIENT || report.patient_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (report.status !== 'Uploaded') throw new ForbiddenException(ERROR_MESSAGES.LAB_REPORT_ALREADY_REVIEWED);

    if (report.file_path) await this.supabase.admin.storage.from(LAB_REPORTS_BUCKET).remove([report.file_path]);
    await this.supabase.admin.from('lab_reports').delete().eq('id', id);

    if (report.request_id) {
      await this.supabase.admin.from('lab_report_requests').update({ status: 'Pending' }).eq('id', report.request_id);
    }
    return { id };
  }

  async requestLabReport(user: AuthUser, body: RequestLabReportDto) {
    this.requireVerifiedDoctor(user);

    const { data: patient } = await this.supabase.admin.from('profiles').select().eq('id', body.patientId).eq('role', ProfileRole.PATIENT).single();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const { data: request } = await this.supabase.admin.from('lab_report_requests').insert({
      doctor_id: user.id,
      patient_id: body.patientId,
      requested_tests: body.requestedTests,
      due_date: body.dueDate || null,
      notes: body.notes || null,
      status: 'Pending',
    }).select().single();

    this.notifications.create(body.patientId, {
      type: 'lab_report_requested',
      title: 'New report requested',
      message: `Dr. ${user.profile.full_name} requested: ${body.requestedTests}${body.dueDate ? ` (by ${body.dueDate})` : ''}`,
      data: { requestId: request.id },
    }).catch(() => {});

    return request;
  }

  async listLabReportRequests(user: AuthUser, patientId?: string) {
    const query = this.supabase.admin.from('lab_report_requests').select().order('created_at', { ascending: false });
    if (user.profile.role === ProfileRole.PATIENT) {
      query.eq('patient_id', user.id);
    } else {
      this.requireVerifiedDoctor(user);
      query.eq('doctor_id', user.id);
      if (patientId) query.eq('patient_id', patientId);
    }
    const { data: requests } = await query;
    if (!requests?.length) return [];

    // Patients see who asked — resolve doctor names the same way
    // PatientsService does for prescriptions/notes (no FK-embed join in use
    // elsewhere in this codebase, so stay consistent with the id->name map pattern).
    if (user.profile.role === ProfileRole.PATIENT) {
      const doctorIds = [...new Set(requests.map(r => r.doctor_id))];
      const { data: doctors } = await this.supabase.admin.from('profiles').select('id, full_name').in('id', doctorIds);
      const nameById = new Map((doctors || []).map(d => [d.id, d.full_name]));
      return requests.map(r => ({ ...r, doctor_name: nameById.get(r.doctor_id) || 'Your Doctor' }));
    }
    return requests;
  }

  async cancelLabReportRequest(user: AuthUser, id: string) {
    this.requireVerifiedDoctor(user);
    const { data: request } = await this.supabase.admin.from('lab_report_requests').select().eq('id', id).single();
    if (!request) throw new NotFoundException(ERROR_MESSAGES.LAB_REPORT_REQUEST_NOT_FOUND);
    if (request.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: updated } = await this.supabase.admin.from('lab_report_requests').update({ status: 'Cancelled' }).eq('id', id).select().single();
    return updated;
  }

  async addClinicalNote(user: AuthUser, body: CreateClinicalNoteDto) {
    this.requireVerifiedDoctor(user);

    const { data: patient } = await this.supabase.admin.from('profiles').select().eq('id', body.patientId).eq('role', ProfileRole.PATIENT).single();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const { data } = await this.supabase.admin.from('clinical_notes').insert({
      patient_id: body.patientId,
      doctor_id: user.id,
      note: body.note,
    }).select().single();
    return data;
  }

  async reviewLabReport(user: AuthUser, id: string, body: ReviewLabReportDto) {
    // Reports are now patient-uploaded, not doctor-ordered — there is no
    // single "owning" doctor to restrict this to, so any verified doctor
    // (same rule guardPatientAccess applies for every other patient) may
    // review. Matches how getLabReports/uploadLabReport already scope access.
    this.requireVerifiedDoctor(user);

    const { data: report } = await this.supabase.admin.from('lab_reports').select().eq('id', id).single();
    if (!report) throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);

    const { data: updated } = await this.supabase.admin.from('lab_reports').update({
      interpretation: body.interpretation ?? report.interpretation,
      doctor_action: body.doctorAction ?? report.doctor_action,
      status: 'Reviewed',
      reviewed_at: new Date().toISOString(),
    }).eq('id', id).select().single();

    this.notifications.create(report.patient_id, {
      type: 'lab_report_reviewed',
      title: 'Lab report reviewed',
      message: `Dr. ${user.profile.full_name} reviewed your "${report.test_name}" report.`,
      data: { labReportId: report.id },
    }).catch(() => {});

    return updated;
  }

  /** Patients may only reach their own patientId; verified doctors may reach any. */
  private guardPatientAccess(user: AuthUser, patientId: string) {
    if (user.profile.role === ProfileRole.PATIENT) {
      if (user.id !== patientId) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
      return;
    }
    this.requireVerifiedDoctor(user);
  }

  async getDocuments(user: AuthUser, patientId: string) {
    this.guardPatientAccess(user, patientId);
    const { data } = await this.supabase.admin.from('patient_documents').select().eq('patient_id', patientId).order('created_at', { ascending: false });
    return data || [];
  }

  async addDocument(user: AuthUser, body: AddDocumentDto) {
    this.guardPatientAccess(user, body.patientId);
    const { data } = await this.supabase.admin.from('patient_documents').insert({
      patient_id: body.patientId,
      uploaded_by: user.id,
      file_name: body.fileName,
      file_type: body.fileType || 'pdf',
      size_bytes: body.sizeBytes || 0,
      lab_name: body.labName,
      file_url: body.fileUrl,
    }).select().single();
    return data;
  }

  async deleteDocument(user: AuthUser, id: string) {
    const { data: doc } = await this.supabase.admin.from('patient_documents').select().eq('id', id).single();
    if (!doc) throw new NotFoundException(ERROR_MESSAGES.DOCUMENT_NOT_FOUND);
    this.guardPatientAccess(user, doc.patient_id);

    await this.supabase.admin.from('patient_documents').delete().eq('id', id);
    return { id };
  }

  async getVaccinations(user: AuthUser, patientId: string) {
    this.guardPatientAccess(user, patientId);
    const { data } = await this.supabase.admin.from('vaccinations').select().eq('patient_id', patientId).order('created_at', { ascending: false });
    return data || [];
  }

  async addVaccination(user: AuthUser, body: AddVaccinationDto) {
    this.guardPatientAccess(user, body.patientId);
    const { data } = await this.supabase.admin.from('vaccinations').insert({
      patient_id: body.patientId,
      name: body.name,
      doses: body.doses,
      completed: body.completed ?? false,
    }).select().single();
    return data;
  }

  async getEmergencyContacts(user: AuthUser, patientId: string) {
    this.guardPatientAccess(user, patientId);
    const { data } = await this.supabase.admin.from('emergency_contacts').select().eq('patient_id', patientId).order('created_at', { ascending: false });
    return data || [];
  }

  async addEmergencyContact(user: AuthUser, body: AddEmergencyContactDto) {
    this.guardPatientAccess(user, body.patientId);
    const { data } = await this.supabase.admin.from('emergency_contacts').insert({
      patient_id: body.patientId,
      name: body.name,
      relation: body.relation,
      phone: body.phone,
    }).select().single();
    return data;
  }

  async deleteEmergencyContact(user: AuthUser, id: string) {
    const { data: contact } = await this.supabase.admin.from('emergency_contacts').select().eq('id', id).single();
    if (!contact) throw new NotFoundException(ERROR_MESSAGES.CONTACT_NOT_FOUND);
    this.guardPatientAccess(user, contact.patient_id);

    await this.supabase.admin.from('emergency_contacts').delete().eq('id', id);
    return { id };
  }
}
