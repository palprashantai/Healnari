import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import {
  AddDocumentDto,
  AddEmergencyContactDto,
  AddVaccinationDto,
  CreatePrescriptionDto,
  ReviewLabReportDto,
} from '@/modules/records/controllers/records.controller';

@Injectable()
export class RecordsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  async getPrescriptions(user: AuthUser) {
    const query = this.supabase.admin.from('prescriptions').select().order('created_at', { ascending: false });
    if (user.profile.role === ProfileRole.DOCTOR) {
      query.eq('doctor_id', user.id);
    } else {
      query.eq('patient_id', user.id);
    }
    const { data } = await query;
    return data || [];
  }

  async createPrescription(user: AuthUser, body: CreatePrescriptionDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    
    const { data: patient } = await this.supabase.admin.from('profiles').select().eq('id', body.patientId).eq('role', ProfileRole.PATIENT).single();
    if (!patient) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    const { data: prescription } = await this.supabase.admin.from('prescriptions').insert({
      patient_id: body.patientId,
      doctor_id: user.id,
      med_name: body.medName,
      dosage: body.dosage,
      schedule: body.schedule,
      duration: body.duration,
      instructions: body.instructions,
      prescribed_at: new Date().toISOString().slice(0, 10),
    }).select().single();

    return prescription;
  }

  async requestRefill(user: AuthUser, id: string) {
    const { data: rx } = await this.supabase.admin.from('prescriptions').select().eq('id', id).eq('patient_id', user.id).single();
    if (!rx) throw new NotFoundException(ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);
    
    const { data: updated } = await this.supabase.admin.from('prescriptions').update({ refill_requested: true }).eq('id', id).select().single();
    return updated;
  }

  async handleRefill(user: AuthUser, id: string, action: 'approve' | 'reject') {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    
    const { data: rx } = await this.supabase.admin.from('prescriptions').select().eq('id', id).single();
    if (!rx) throw new NotFoundException(ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);

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

  async getLabReports(user: AuthUser) {
    const query = this.supabase.admin.from('lab_reports').select().order('created_at', { ascending: false });
    if (user.profile.role === ProfileRole.PATIENT) {
      query.eq('patient_id', user.id);
    }
    const { data } = await query;
    return data || [];
  }

  async reviewLabReport(user: AuthUser, id: string, body: ReviewLabReportDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: report } = await this.supabase.admin.from('lab_reports').select().eq('id', id).single();
    if (!report) throw new NotFoundException(ERROR_MESSAGES.LAB_RESULT_NOT_FOUND);

    const { data: updated } = await this.supabase.admin.from('lab_reports').update({
      interpretation: body.interpretation ?? report.interpretation,
      doctor_action: body.doctorAction ?? report.doctor_action,
      status: 'Completed',
    }).eq('id', id).select().single();
    return updated;
  }

  /** Patients may only reach their own patientId; doctors may reach any. */
  private guardPatientAccess(user: AuthUser, patientId: string) {
    if (user.profile.role === ProfileRole.PATIENT && user.id !== patientId) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }
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
