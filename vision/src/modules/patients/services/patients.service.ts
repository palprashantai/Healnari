import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientRecord } from '@/shared/interfaces/patient-record.interface';
import { CycleLog } from '@/shared/interfaces/cycle-log.interface';
import { Profile, ProfileRole } from '@/shared/interfaces/profile.interface';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreatePatientDto, LogCycleDto, UpdatePatientDto } from '@/modules/patients/controllers/patients.controller';

@Injectable()
export class PatientsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  private requireDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  private async assemble(profile: Profile, record: PatientRecord | null) {
    const [medsRes, reportsRes, notesRes, paymentsRes] = await Promise.all([
      this.supabase.admin.from('prescriptions').select().eq('patient_id', profile.id).order('created_at', { ascending: false }),
      this.supabase.admin.from('lab_reports').select().eq('patient_id', profile.id).order('created_at', { ascending: false }),
      this.supabase.admin.from('clinical_notes').select().eq('patient_id', profile.id).order('created_at', { ascending: false }),
      this.supabase.admin.from('payments').select().eq('patient_id', profile.id).order('created_at', { ascending: false }),
    ]);
    return {
      profile,
      record,
      prescriptions: medsRes.data || [],
      lab_reports: reportsRes.data || [],
      clinical_notes: notesRes.data || [],
      payments: paymentsRes.data || [],
    };
  }

  async list(user: AuthUser) {
    this.requireDoctor(user);
    const { data: patients } = await this.supabase.admin.from('profiles').select().eq('role', ProfileRole.PATIENT);
    if (!patients || !patients.length) return [];

    const { data: records } = await this.supabase.admin.from('patient_records').select().in('patient_id', patients.map(p => p.id));
    const recordByPatient = new Map((records || []).map(r => [r.patient_id, r]));
    
    return Promise.all(patients.map(p => this.assemble(p, recordByPatient.get(p.id) || null)));
  }

  async create(user: AuthUser, body: CreatePatientDto) {
    this.requireDoctor(user);

    const email = body.email || `patient.${Date.now()}@healnari.local`;
    const password = Math.random().toString(36).slice(2) + 'A1!';
    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: ProfileRole.PATIENT, full_name: body.name },
    });
    if (error) throw new ForbiddenException(error.message);

    if (body.phone || body.bloodGroup) {
      await this.supabase.admin.from('profiles').update({ phone: body.phone }).eq('id', data.user.id);
    }
    if (body.bloodGroup) {
      await this.supabase.admin.from('patient_records').update({ blood_group: body.bloodGroup }).eq('patient_id', data.user.id);
    }

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', data.user.id).single();
    const { data: record } = await this.supabase.admin.from('patient_records').select().eq('patient_id', data.user.id).single();
    
    return this.assemble(profile, record || null);
  }

  async getOwn(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: record } = await this.supabase.admin.from('patient_records').select().eq('patient_id', user.id).single();
    return this.assemble(user.profile, record || null);
  }

  async update(user: AuthUser, patientId: string, body: UpdatePatientDto) {
    if (user.profile.role !== ProfileRole.DOCTOR && user.id !== patientId) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', patientId).eq('role', ProfileRole.PATIENT).single();
    if (!profile) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    if (body.name !== undefined) await this.supabase.admin.from('profiles').update({ full_name: body.name }).eq('id', patientId);
    if (body.phone !== undefined) await this.supabase.admin.from('profiles').update({ phone: body.phone }).eq('id', patientId);

    const recordPatch: any = {};
    if (body.dob !== undefined) recordPatch.dob = body.dob;
    if (body.bloodGroup !== undefined) recordPatch.blood_group = body.bloodGroup;
    if (body.heightCm !== undefined) recordPatch.height_cm = String(body.heightCm);
    if (body.weightKg !== undefined) recordPatch.weight_kg = String(body.weightKg);
    if (body.allergies !== undefined) recordPatch.allergies = body.allergies;
    if (body.chronicConditions !== undefined) recordPatch.chronic_conditions = body.chronicConditions;
    if (Object.keys(recordPatch).length > 0) {
      await this.supabase.admin.from('patient_records').update(recordPatch).eq('patient_id', patientId);
    }

    const { data: updatedProfile } = await this.supabase.admin.from('profiles').select().eq('id', patientId).single();
    const { data: record } = await this.supabase.admin.from('patient_records').select().eq('patient_id', patientId).single();
    
    return this.assemble(updatedProfile, record || null);
  }

  async getCycleLogs(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: logs } = await this.supabase.admin.from('cycle_logs').select().eq('patient_id', user.id).order('log_date', { ascending: false });
    return logs || [];
  }

  async logCycle(user: AuthUser, date: string, body: LogCycleDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    let { data: log } = await this.supabase.admin.from('cycle_logs').select().eq('patient_id', user.id).eq('log_date', date).single();
    if (!log) {
      const { data: newLog } = await this.supabase.admin.from('cycle_logs').insert({ patient_id: user.id, log_date: date, symptoms: [], ...body }).select().single();
      return newLog;
    } else {
      const { data: updatedLog } = await this.supabase.admin.from('cycle_logs').update(body).eq('id', log.id).select().single();
      return updatedLog;
    }
  }
}
