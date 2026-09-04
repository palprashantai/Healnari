import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES, ERROR_CODES } from '@/core/constants/errors.constant';
import { EmailService } from '@/core/email/email.service';
import {
  AddDocumentDto,
  AddEmergencyContactDto,
  AddVaccinationDto,
  CreateCatalogItemDto,
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
  private readonly logger = new Logger(RecordsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  /** Doctor role alone isn't enough to read/write other people's PHI — the
   * account must also be admin-verified (see DoctorsService.verifyKyc). */
  private requireVerifiedDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!user.profile.kyc_verified)
      throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
  }

  /** Verified-doctor role alone used to be treated as "may reach any
   * patient's PHI" — fixed per AUDIT_REPORT.md SEC-1. A doctor may only
   * reach a patient they have an actual appointment with (any status,
   * present or past), or one they registered themselves as a walk-in
   * (patient_records.created_by_doctor_id — the one legitimate case with no
   * appointment yet). */
  private async hasCareRelationship(
    doctorId: string,
    patientId: string,
  ): Promise<boolean> {
    const [{ count: apptCount }, { data: record }] = await Promise.all([
      this.supabase.admin
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('doctor_id', doctorId)
        .eq('patient_id', patientId),
      this.supabase.admin
        .from('patient_records')
        .select('created_by_doctor_id')
        .is('deleted_at', null)
        .eq('patient_id', patientId)
        .maybeSingle(),
    ]);
    if ((apptCount || 0) > 0) return true;
    return record?.created_by_doctor_id === doctorId;
  }

  /** Every patient id a doctor may legitimately reach — used for the
   * cross-patient review-queue views (e.g. getLabReports() with no
   * patientId) that used to return every patient's data platform-wide. */
  private async getDoctorPatientIds(doctorId: string): Promise<string[]> {
    const [{ data: appts }, { data: records }] = await Promise.all([
      this.supabase.admin
        .from('appointments')
        .select('patient_id')
        .is('deleted_at', null)
        .eq('doctor_id', doctorId),
      this.supabase.admin
        .from('patient_records')
        .select('patient_id')
        .is('deleted_at', null)
        .eq('created_by_doctor_id', doctorId),
    ]);
    return [
      ...new Set([
        ...(appts || []).map((a: any) => a.patient_id),
        ...(records || []).map((r: any) => r.patient_id),
      ]),
    ];
  }

  async getPrescriptions(user: AuthUser) {
    const query = this.supabase.admin
      .from('prescriptions')
      .select()
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
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
    if (!(await this.hasCareRelationship(user.id, body.patientId)))
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: patient } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', body.patientId)
      .eq('role', ProfileRole.PATIENT)
      .maybeSingle();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    if (body.idempotencyKey) {
      const { data: existing } = await this.supabase.admin
        .from('prescriptions')
        .select()
        .is('deleted_at', null)
        .eq('group_id', body.idempotencyKey);
      if (existing && existing.length > 0) return existing;
    }

    const groupId = body.idempotencyKey || randomUUID();
    const prescribedAt = new Date().toISOString().slice(0, 10);

    // Deduplicate medicine lines if same medicine is entered multiple times in the same payload
    const seenMeds = new Set<string>();
    const uniqueMedicines = body.medicines.filter((m) => {
      const normalized = (m.medName || '').trim().toLowerCase();
      if (!normalized || seenMeds.has(normalized)) return false;
      seenMeds.add(normalized);
      return true;
    });

    const rows = uniqueMedicines.map((m) => ({
      patient_id: body.patientId,
      doctor_id: user.id,
      group_id: groupId,
      diagnosis: body.diagnosis,
      med_name: m.medName.trim(),
      dosage: m.dosage,
      schedule: m.schedule,
      duration: m.duration,
      instructions: body.instructions,
      prescribed_at: prescribedAt,
    }));

    const { data: prescriptions } = await this.supabase.admin
      .from('prescriptions')
      .insert(rows)
      .select()
      .is('deleted_at', null);

    this.notifications
      .create(body.patientId, {
        type: 'prescription_issued',
        title: 'New prescription',
        message: `Dr. ${user.profile.full_name} issued a new prescription${body.diagnosis ? ` for ${body.diagnosis}` : ''} (${body.medicines.length} medicine${body.medicines.length > 1 ? 's' : ''}).`,
        idempotencyKey: `rx_issued_${groupId}`,
        data: { groupId, path: '/patient-dashboard/prescriptions' },
      })
      .catch(() => {});

    // Fetch patient email and send email notification
    this.supabase.admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', body.patientId)
      .maybeSingle()
      .then(
        ({ data: patient }) => {
          if (patient?.email) {
            this.email.sendTemplateEmail({
              templateKey: 'prescription_issued',
              to: patient.email,
              variables: {
                patientName: patient.full_name || 'Patient',
                doctorName: user.profile.full_name || 'Doctor',
                diagnosis: body.diagnosis || 'General Consultation Plan',
                medicineCount: body.medicines?.length || 1,
                recordsUrl: this.email.getUrl('/patient-dashboard/prescriptions'),
              },
              entityType: 'prescription_group',
              entityId: groupId,
              event: 'prescription_issued',
            });
          }
        },
        (err) => console.error('Failed to notify patient of prescription:', err)
      );

    return prescriptions;
  }

  async requestRefill(user: AuthUser, id: string) {
    const { data: rx } = await this.supabase.admin
      .from('prescriptions')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .eq('patient_id', user.id)
      .maybeSingle();
    if (!rx) throw new NotFoundException(ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);

    const { data: updated } = await this.supabase.admin
      .from('prescriptions')
      .update({ refill_requested: true })
      .eq('id', id)
      .select()
      .is('deleted_at', null)
      .maybeSingle();

    if (rx.doctor_id) {
      this.notifications
        .create(rx.doctor_id, {
          type: 'refill_requested',
          title: 'Prescription Refill Requested',
          message: `${user.profile?.full_name || 'A patient'} requested a refill for ${rx.med_name}.`,
          idempotencyKey: `refill_req_${id}_${Date.now()}`,
          data: {
            prescriptionId: id,
            patientId: user.id,
            path: '/doctor-dashboard/prescriptions',
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  async handleRefill(user: AuthUser, id: string, action: 'approve' | 'reject') {
    this.requireVerifiedDoctor(user);

    const { data: rx } = await this.supabase.admin
      .from('prescriptions')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!rx) throw new NotFoundException(ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);
    // Only the prescribing doctor may action a refill on their own line —
    // unassigned (legacy) prescriptions with no doctor_id remain open to any
    // verified doctor, matching prior behavior for those rows.
    if (rx.doctor_id && rx.doctor_id !== user.id)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const patch: any = { refill_requested: false };
    if (action === 'approve') {
      patch.refills_left = rx.refills_left + 1;
      const validTill = new Date();
      validTill.setDate(validTill.getDate() + 90);
      patch.valid_till = validTill.toISOString().slice(0, 10);
    }

    const { data: updated } = await this.supabase.admin
      .from('prescriptions')
      .update(patch)
      .eq('id', id)
      .select()
      .is('deleted_at', null)
      .maybeSingle();
    return updated;
  }

  async getLabReports(user: AuthUser, patientId?: string) {
    // Patients are always scoped to themselves. A doctor may either scope to
    // one patient (the EMR tab's use case) or omit patientId for their
    // cross-patient review queue (Reports.jsx's use case) — scoped to only
    // patients they actually have a relationship with, not every patient on
    // the platform (see AUDIT_REPORT.md SEC-1).
    const scopedPatientId =
      user.profile.role === ProfileRole.PATIENT ? user.id : patientId;
    if (scopedPatientId) {
      await this.guardPatientAccess(user, scopedPatientId);
      const { data } = await this.supabase.admin
        .from('lab_reports')
        .select()
        .is('deleted_at', null)
        .eq('patient_id', scopedPatientId)
        .order('created_at', { ascending: false });
      return data || [];
    } else {
      this.requireVerifiedDoctor(user);
      // N+1 Optimization: Using RPC to perform the patient_id join directly in the DB
      // rather than fetching all patient IDs and passing them back in an IN clause.
      const { data } = await this.supabase.admin.rpc('get_doctor_lab_reports', {
        p_doctor_id: user.id,
      });
      return data || [];
    }
  }

  async uploadLabReport(
    user: AuthUser,
    file: Express.Multer.File,
    body: UploadLabReportDto,
  ) {
    await this.guardPatientAccess(user, body.patientId);

    if (!ALLOWED_LAB_REPORT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }

    let request: any = null;
    if (body.requestId) {
      const { data } = await this.supabase.admin
        .from('lab_report_requests')
        .select()
        .eq('id', body.requestId)
        .maybeSingle();
      if (!data || data.patient_id !== body.patientId)
        throw new NotFoundException(
          ERROR_MESSAGES.LAB_REPORT_REQUEST_NOT_FOUND,
        );
      request = data;
    }

    const testName = body.testName || request?.requested_tests;
    if (!testName) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST);

    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };
    const ext = mimeToExt[file.mimetype] || 'pdf';
    const sanitizedBase = (file.originalname || 'document')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 60);
    const path = `${body.patientId}/${randomUUID()}-${sanitizedBase}.${ext}`;

    const { error: uploadError } = await this.supabase.admin.storage
      .from(LAB_REPORTS_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (uploadError) {
      this.logger.error(
        `Lab report upload to storage failed for patient ${body.patientId}: ${uploadError.message}`,
        uploadError,
      );
      throw new InternalServerErrorException({
        message: 'Failed to upload lab report file. Please try again.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }

    const { data: report } = await this.supabase.admin
      .from('lab_reports')
      .insert({
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
      })
      .select()
      .maybeSingle();

    if (request) {
      await this.supabase.admin
        .from('lab_report_requests')
        .update({ status: 'Fulfilled' })
        .eq('id', request.id);
      this.notifications
        .create(request.doctor_id, {
          type: 'lab_report_uploaded',
          title: 'Lab report uploaded',
          message: `A new report for "${testName}" was uploaded.`,
          idempotencyKey: `lab_upload_${report.id}`,
          data: {
            labReportId: report.id,
            requestId: request.id,
            path: '/doctor-dashboard/reports',
          },
        })
        .catch(() => {});
    } else {
      // Find the patient's most recent doctor to notify
      const { data: recentAppt } = await this.supabase.admin
        .from('appointments')
        .select('doctor_id')
        .eq('patient_id', body.patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentAppt?.doctor_id) {
        this.notifications
          .create(recentAppt.doctor_id, {
            type: 'lab_report_uploaded',
            title: 'Lab report uploaded',
            message: `A patient uploaded a new lab report ("${testName}").`,
            idempotencyKey: `lab_upload_${report.id}`,
            data: {
              labReportId: report.id,
              patientId: body.patientId,
              path: '/doctor-dashboard/reports',
            },
          })
          .catch(() => {});
      }
    }

    return report;
  }

  async getSignedUrl(user: AuthUser, id: string) {
    const { data: report } = await this.supabase.admin
      .from('lab_reports')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!report)
      throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);
    await this.guardPatientAccess(user, report.patient_id);
    if (!report.file_path)
      throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);

    const { data, error } = await this.supabase.admin.storage
      .from(LAB_REPORTS_BUCKET)
      .createSignedUrl(report.file_path, 3600);
    if (error || !data) {
      this.logger.error(
        `Failed to generate signed URL for lab report ${id}: ${error?.message}`,
        error,
      );
      throw new InternalServerErrorException({
        message: 'Unable to access document file at this time. Please try again.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
    return {
      url: data.signedUrl,
      fileType: report.file_type,
      originalFilename: report.original_filename,
    };
  }

  async deleteLabReport(user: AuthUser, id: string) {
    const { data: report } = await this.supabase.admin
      .from('lab_reports')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!report)
      throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);
    if (
      user.profile.role !== ProfileRole.PATIENT ||
      report.patient_id !== user.id
    )
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (report.status !== 'Uploaded')
      throw new ForbiddenException(ERROR_MESSAGES.LAB_REPORT_ALREADY_REVIEWED);

    if (report.file_path)
      await this.supabase.admin.storage
        .from(LAB_REPORTS_BUCKET)
        .remove([report.file_path]);
    await this.supabase.admin
      .from('lab_reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (report.request_id) {
      await this.supabase.admin
        .from('lab_report_requests')
        .update({ status: 'Pending' })
        .eq('id', report.request_id);
    }
    return { id };
  }

  async requestLabReport(user: AuthUser, body: RequestLabReportDto) {
    this.requireVerifiedDoctor(user);
    if (!(await this.hasCareRelationship(user.id, body.patientId)))
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: patient } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', body.patientId)
      .eq('role', ProfileRole.PATIENT)
      .maybeSingle();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const { data: request } = await this.supabase.admin
      .from('lab_report_requests')
      .insert({
        doctor_id: user.id,
        patient_id: body.patientId,
        requested_tests: body.requestedTests,
        due_date: body.dueDate || null,
        notes: body.notes || null,
        status: 'Pending',
      })
      .select()
      .maybeSingle();

    this.notifications
      .create(body.patientId, {
        type: 'lab_report_requested',
        title: 'New report requested',
        message: `Dr. ${user.profile.full_name} requested: ${body.requestedTests}${body.dueDate ? ` (by ${body.dueDate})` : ''}`,
        idempotencyKey: `lab_req_${request.id}`,
        data: { requestId: request.id, path: '/patient-dashboard/records' },
      })
      .catch(() => {});

    return request;
  }

  async listLabReportRequests(user: AuthUser, patientId?: string) {
    const query = this.supabase.admin
      .from('lab_report_requests')
      .select()
      .order('created_at', { ascending: false });
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
      const doctorIds = [...new Set(requests.map((r) => r.doctor_id))];
      const { data: doctors } = await this.supabase.admin
        .from('profiles')
        .select('id, full_name')
        .in('id', doctorIds);
      const nameById = new Map((doctors || []).map((d) => [d.id, d.full_name]));
      return requests.map((r) => ({
        ...r,
        doctor_name: nameById.get(r.doctor_id) || 'Your Doctor',
      }));
    }
    return requests;
  }

  async cancelLabReportRequest(user: AuthUser, id: string) {
    this.requireVerifiedDoctor(user);
    const { data: request } = await this.supabase.admin
      .from('lab_report_requests')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (!request)
      throw new NotFoundException(ERROR_MESSAGES.LAB_REPORT_REQUEST_NOT_FOUND);
    if (request.doctor_id !== user.id)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: updated } = await this.supabase.admin
      .from('lab_report_requests')
      .update({ status: 'Cancelled' })
      .eq('id', id)
      .select()
      .maybeSingle();
    return updated;
  }

  async addClinicalNote(user: AuthUser, body: CreateClinicalNoteDto) {
    this.requireVerifiedDoctor(user);
    if (!(await this.hasCareRelationship(user.id, body.patientId)))
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: patient } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', body.patientId)
      .eq('role', ProfileRole.PATIENT)
      .maybeSingle();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const { data } = await this.supabase.admin
      .from('clinical_notes')
      .insert({
        patient_id: body.patientId,
        doctor_id: user.id,
        note: body.note,
      })
      .select()
      .maybeSingle();
    return data;
  }

  async reviewLabReport(user: AuthUser, id: string, body: ReviewLabReportDto) {
    // Reports are patient-uploaded, not doctor-ordered — there's no single
    // "owning" doctor, but that no longer means ANY verified doctor (see
    // AUDIT_REPORT.md SEC-1) — only one with an actual relationship to this
    // patient may review it.
    this.requireVerifiedDoctor(user);

    const { data: report } = await this.supabase.admin
      .from('lab_reports')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();
    if (!report)
      throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);
    if (!(await this.hasCareRelationship(user.id, report.patient_id)))
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: updated } = await this.supabase.admin
      .from('lab_reports')
      .update({
        interpretation: body.interpretation ?? report.interpretation,
        doctor_action: body.doctorAction ?? report.doctor_action,
        status: 'Reviewed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    this.notifications
      .create(report.patient_id, {
        type: 'lab_report_reviewed',
        title: 'Lab report reviewed',
        message: `Dr. ${user.profile.full_name} reviewed your "${report.test_name}" report.`,
        idempotencyKey: `lab_review_${report.id}`,
        data: { labReportId: report.id, path: '/patient-dashboard/records' },
      })
      .catch(() => {});

    return updated;
  }

  /** Patients may only reach their own patientId; verified doctors may only
   * reach a patient they have a real care relationship with — see
   * hasCareRelationship(). */
  private async guardPatientAccess(user: AuthUser, patientId: string) {
    if (user.profile.role === ProfileRole.PATIENT) {
      if (user.id !== patientId)
        throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
      return;
    }
    this.requireVerifiedDoctor(user);
    if (!(await this.hasCareRelationship(user.id, patientId)))
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  async getDocuments(user: AuthUser, patientId: string) {
    await this.guardPatientAccess(user, patientId);
    const { data } = await this.supabase.admin
      .from('patient_documents')
      .select()
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async addDocument(user: AuthUser, body: AddDocumentDto) {
    await this.guardPatientAccess(user, body.patientId);
    const { data } = await this.supabase.admin
      .from('patient_documents')
      .insert({
        patient_id: body.patientId,
        uploaded_by: user.id,
        file_name: body.fileName,
        file_type: body.fileType || 'pdf',
        size_bytes: body.sizeBytes || 0,
        lab_name: body.labName,
        file_url: body.fileUrl,
      })
      .select()
      .maybeSingle();
    return data;
  }

  async deleteDocument(user: AuthUser, id: string) {
    const { data: doc } = await this.supabase.admin
      .from('patient_documents')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (!doc) throw new NotFoundException(ERROR_MESSAGES.DOCUMENT_NOT_FOUND);
    await this.guardPatientAccess(user, doc.patient_id);

    await this.supabase.admin.from('patient_documents').delete().eq('id', id);
    return { id };
  }

  async getVaccinations(user: AuthUser, patientId: string) {
    await this.guardPatientAccess(user, patientId);
    const { data } = await this.supabase.admin
      .from('vaccinations')
      .select()
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async addVaccination(user: AuthUser, body: AddVaccinationDto) {
    await this.guardPatientAccess(user, body.patientId);
    const { data } = await this.supabase.admin
      .from('vaccinations')
      .insert({
        patient_id: body.patientId,
        name: body.name,
        doses: body.doses,
        completed: body.completed ?? false,
      })
      .select()
      .maybeSingle();
    return data;
  }

  async getEmergencyContacts(user: AuthUser, patientId: string) {
    await this.guardPatientAccess(user, patientId);
    const { data } = await this.supabase.admin
      .from('emergency_contacts')
      .select()
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async addEmergencyContact(user: AuthUser, body: AddEmergencyContactDto) {
    await this.guardPatientAccess(user, body.patientId);
    const { data } = await this.supabase.admin
      .from('emergency_contacts')
      .insert({
        patient_id: body.patientId,
        name: body.name,
        relation: body.relation,
        phone: body.phone,
      })
      .select()
      .maybeSingle();
    return data;
  }

  async deleteEmergencyContact(user: AuthUser, id: string) {
    const { data: contact } = await this.supabase.admin
      .from('emergency_contacts')
      .select()
      .eq('id', id)
      .maybeSingle();
    if (!contact) throw new NotFoundException(ERROR_MESSAGES.CONTACT_NOT_FOUND);
    await this.guardPatientAccess(user, contact.patient_id);

    await this.supabase.admin.from('emergency_contacts').delete().eq('id', id);
    return { id };
  }

  async getCatalog(user: AuthUser, type?: 'medicine' | 'lab_test') {
    let query = this.supabase.admin
      .from('clinical_catalog')
      .select('*')
      .is('deleted_at', null);

    if (type) {
      query = query.eq('type', type);
    }

    if (user.profile.role !== ProfileRole.ADMIN) {
      // Return global items (doctor_id is null) + caller's custom items
      query = query.or(`doctor_id.is.null,doctor_id.eq.${user.id}`);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) {
      return [];
    }
    return data || [];
  }

  async createCatalogItem(user: AuthUser, body: CreateCatalogItemDto) {
    const isAdmin = user.profile.role === ProfileRole.ADMIN;
    const isDoctor = user.profile.role === ProfileRole.DOCTOR;

    if (!isAdmin && !isDoctor) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    if (isDoctor && !user.profile.kyc_verified && !isAdmin) {
      throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
    }

    const doctorId = isAdmin && body.isGlobal ? null : user.id;

    const row = {
      type: body.type,
      doctor_id: doctorId,
      name: body.name.trim(),
      category: body.category?.trim() || null,
      default_dose: body.defaultDose?.trim() || null,
      default_freq: body.defaultFreq?.trim() || null,
      default_timing: body.defaultTiming?.trim() || null,
      default_duration: body.defaultDuration?.trim() || null,
      badge: body.badge?.trim() || null,
      instructions: body.instructions?.trim() || null,
    };

    const { data, error } = await this.supabase.admin
      .from('clinical_catalog')
      .insert(row)
      .select()
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Failed to create catalog item',
      );
    }

    return data;
  }

  async deleteCatalogItem(user: AuthUser, id: string) {
    const { data: item } = await this.supabase.admin
      .from('clinical_catalog')
      .select()
      .is('deleted_at', null)
      .eq('id', id)
      .maybeSingle();

    if (!item) throw new NotFoundException('Catalog item not found');

    const isAdmin = user.profile.role === ProfileRole.ADMIN;
    if (!isAdmin && item.doctor_id !== user.id) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    await this.supabase.admin
      .from('clinical_catalog')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    return { id };
  }

  // ── Clinical Protocol Bundles ──

  async getProtocols(user: AuthUser) {
    const query = this.supabase.admin
      .from('clinical_protocols')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true);

    // Doctors see global (doctor_id is null) + their own custom protocols
    // Admins see everything
    const isAdmin = user.profile.role === ProfileRole.ADMIN;
    const filtered = isAdmin
      ? query
      : query.or(`doctor_id.is.null,doctor_id.eq.${user.id}`);

    const { data, error } = await filtered
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error) return [];
    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.short_name,
      category: p.category,
      badge: p.badge,
      description: p.description,
      diagnosis: p.diagnosis,
      meds: p.meds || [],
      labs: p.labs || [],
      clinicalNotes: p.clinical_notes,
      isCustom: !!p.doctor_id,
    }));
  }

  async createProtocol(
    user: AuthUser,
    body: {
      name: string;
      shortName?: string;
      category?: string;
      badge?: string;
      description?: string;
      diagnosis?: string;
      meds?: any[];
      labs?: string[];
      clinicalNotes?: string;
      isGlobal?: boolean;
    },
  ) {
    const isAdmin = user.profile.role === ProfileRole.ADMIN;
    const isDoctor = user.profile.role === ProfileRole.DOCTOR;
    if (!isAdmin && !isDoctor)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const doctorId = isAdmin && body.isGlobal ? null : user.id;

    const { data, error } = await this.supabase.admin
      .from('clinical_protocols')
      .insert({
        doctor_id: doctorId,
        name: body.name,
        short_name: body.shortName,
        category: body.category || 'General',
        badge: body.badge,
        description: body.description,
        diagnosis: body.diagnosis,
        meds: body.meds || [],
        labs: body.labs || [],
        clinical_notes: body.clinicalNotes,
      })
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to create clinical protocol for doctor ${doctorId}: ${error.message}`,
        error,
      );
      throw new BadRequestException({
        message: 'Unable to create clinical protocol. Please check your parameters and try again.',
        errorCode: ERROR_CODES.BAD_REQUEST,
      });
    }
    return data;
  }
}
