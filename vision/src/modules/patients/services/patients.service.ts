import { randomBytes } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PatientRecord } from '@/shared/interfaces/patient-record.interface';
import { CycleLog } from '@/shared/interfaces/cycle-log.interface';
import { VitalKey } from '@/shared/interfaces/vitals-log.interface';
import { Profile, ProfileRole } from '@/shared/interfaces/profile.interface';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { addDays, computeFertilityPrediction, computeQuickEstimate } from '@/modules/patients/services/fertility-prediction.util';
import {
  CreatePatientDto,
  InviteConnectionDto,
  JoinWaitlistDto,
  LogCycleDto,
  LogLifestyleDto,
  LogVitalDto,
  QuickFertilityEstimateDto,
  UpdateConnectionPermissionsDto,
  UpdatePatientDto,
} from '@/modules/patients/controllers/patients.controller';

const VITAL_KEYS: VitalKey[] = [
  'weight',
  'bp',
  'sugar',
  'sleep',
  'hirsutism',
  'bbt',
  'lh',
  'hotflashes',
  'mfg_score',
  'systolic',
  'diastolic',
  'fasting_glucose',
  'postprandial_glucose',
];

@Injectable()
export class PatientsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) { }

  private requireDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  /** Doctor role alone isn't enough to read/write other people's PHI — the
   * account must also be admin-verified (see DoctorsService.verifyKyc). */
  private requireVerifiedDoctor(user: AuthUser) {
    this.requireDoctor(user);
    if (!user.profile.kyc_verified) throw new ForbiddenException(ERROR_MESSAGES.DOCTOR_NOT_VERIFIED);
  }

  /** Verified-doctor role alone used to be treated as "may reach any
   * patient" — fixed per AUDIT_REPORT.md SEC-1. Mirrors
   * RecordsService.hasCareRelationship() — kept as a separate copy rather
   * than a shared base class, matching how requireVerifiedDoctor is already
   * duplicated between these two services in this codebase. */
  private async hasCareRelationship(doctorId: string, patientId: string): Promise<boolean> {
    const [{ count: apptCount }, { data: record }] = await Promise.all([
      this.supabase.admin.from('appointments').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('doctor_id', doctorId).eq('patient_id', patientId),
      this.supabase.admin.from('patient_records').select('created_by_doctor_id').is('deleted_at', null).eq('patient_id', patientId).maybeSingle(),
    ]);
    if ((apptCount || 0) > 0) return true;
    return record?.created_by_doctor_id === doctorId;
  }



  private async assemble(profile: Profile, record: PatientRecord | null) {
    const [medsRes, reportsRes, notesRes, paymentsRes] = await Promise.all([
      this.supabase.admin.from('prescriptions').select().is('deleted_at', null).eq('patient_id', profile.id).order('created_at', { ascending: false }),
      this.supabase.admin.from('lab_reports').select().is('deleted_at', null).eq('patient_id', profile.id).order('created_at', { ascending: false }),
      this.supabase.admin.from('clinical_notes').select().is('deleted_at', null).eq('patient_id', profile.id).order('created_at', { ascending: false }),
      this.supabase.admin.from('payments').select().eq('patient_id', profile.id).order('created_at', { ascending: false }),
    ]);
    const prescriptions = medsRes.data || [];
    const notes = notesRes.data || [];

    // Attach the real prescribing/authoring doctor's name (+ specialty/reg no,
    // for a proper prescription letterhead) — some legacy rows have no
    // doctor_id (see records.service.ts), so those fall back to a generic label.
    const doctorIds = [...new Set([...prescriptions.map(p => p.doctor_id), ...notes.map(n => n.doctor_id)].filter(Boolean))];
    let doctorById = new Map<string, { full_name: string; specialty: string | null; registration_no: string | null }>();
    if (doctorIds.length) {
      const { data: doctors } = await this.supabase.admin.from('profiles').select('id, full_name, specialty, registration_no').in('id', doctorIds);
      doctorById = new Map((doctors || []).map(d => [d.id, d]));
    }

    return {
      profile,
      record,
      prescriptions: prescriptions.map(p => ({
        ...p,
        doctor_name: (p.doctor_id && doctorById.get(p.doctor_id)?.full_name) || 'Your Doctor',
        doctor_specialty: (p.doctor_id && doctorById.get(p.doctor_id)?.specialty) || null,
        doctor_registration_no: (p.doctor_id && doctorById.get(p.doctor_id)?.registration_no) || null,
      })),
      lab_reports: reportsRes.data || [],
      clinical_notes: notes.map(n => ({ ...n, doctor_name: (n.doctor_id && doctorById.get(n.doctor_id)?.full_name) || 'Your Doctor' })),
      payments: paymentsRes.data || [],
    };
  }

  async list(user: AuthUser) {
    this.requireVerifiedDoctor(user);
    
    const { data, error } = await this.supabase.admin.rpc('get_doctor_patients', { p_doctor_id: user.id });
    if (error || !data || !data.length) return [];

    // Collect all unique doctor IDs to fetch doctor profiles once
    const allDoctorIds = new Set<string>();
    data.forEach(row => {
      (row.prescriptions || []).forEach((p: any) => { if (p.doctor_id) allDoctorIds.add(p.doctor_id); });
      (row.clinical_notes || []).forEach((n: any) => { if (n.doctor_id) allDoctorIds.add(n.doctor_id); });
    });

    let doctorById = new Map<string, any>();
    if (allDoctorIds.size > 0) {
      const { data: doctors } = await this.supabase.admin.from('profiles').select('id, full_name, specialty, registration_no').in('id', Array.from(allDoctorIds));
      doctorById = new Map((doctors || []).map(d => [d.id, d]));
    }

    return data.map(row => ({
      profile: row.profile,
      record: row.record,
      prescriptions: (row.prescriptions || []).map((p: any) => ({
        ...p,
        doctor_name: (p.doctor_id && doctorById.get(p.doctor_id)?.full_name) || 'Your Doctor',
        doctor_specialty: (p.doctor_id && doctorById.get(p.doctor_id)?.specialty) || null,
        doctor_registration_no: (p.doctor_id && doctorById.get(p.doctor_id)?.registration_no) || null,
      })),
      lab_reports: row.lab_reports || [],
      clinical_notes: (row.clinical_notes || []).map((n: any) => ({
        ...n,
        doctor_name: (n.doctor_id && doctorById.get(n.doctor_id)?.full_name) || 'Your Doctor',
      })),
      payments: row.payments || [],
    }));
  }

  async create(user: AuthUser, body: CreatePatientDto) {
    this.requireVerifiedDoctor(user);

    const email = body.email || `patient.${Date.now()}@healnari.local`;
    const password = randomBytes(12).toString('base64url') + 'A1!';
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
    // Registering this patient is what establishes the care relationship —
    // there's no appointment yet, so without this the doctor who just
    // created the patient couldn't open the record they were just filling
    // in (see AUDIT_REPORT.md SEC-1 / hasCareRelationship()).
    await this.supabase.admin.from('patient_records').update({
      ...(body.bloodGroup ? { blood_group: body.bloodGroup } : {}),
      created_by_doctor_id: user.id,
    }).eq('patient_id', data.user.id);

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', data.user.id).maybeSingle();
    const { data: record } = await this.supabase.admin.from('patient_records').select().eq('patient_id', data.user.id).is('deleted_at', null).maybeSingle();

    return this.assemble(profile, record || null);
  }

  async getOwn(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: record } = await this.supabase.admin.from('patient_records').select().eq('patient_id', user.id).is('deleted_at', null).maybeSingle();
    return this.assemble(user.profile, record || null);
  }

  async getOwnAuditLogs(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data, error } = await this.supabase.admin
      .from('phi_audit_logs')
      .select(`
        id, actor_id, actor_role, action, resource, status, ip_address, created_at,
        actor:profiles!phi_audit_logs_actor_id_fkey(full_name)
      `)
      .eq('target_patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  async update(user: AuthUser, patientId: string, body: UpdatePatientDto) {
    if (user.id !== patientId) {
      this.requireVerifiedDoctor(user);
      if (!(await this.hasCareRelationship(user.id, patientId))) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    }

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', patientId).eq('role', ProfileRole.PATIENT).maybeSingle();
    if (!profile) throw new NotFoundException(ERROR_MESSAGES.PATIENT_NOT_FOUND);

    if (body.name !== undefined) await this.supabase.admin.from('profiles').update({ full_name: body.name }).eq('id', patientId);
    if (body.phone !== undefined) await this.supabase.admin.from('profiles').update({ phone: body.phone }).eq('id', patientId);

    const recordPatch: any = {};
    if (body.dob !== undefined) recordPatch.dob = body.dob;
    if (body.bloodGroup !== undefined) recordPatch.blood_group = body.bloodGroup;
    if (body.heightCm !== undefined) recordPatch.height_cm = String(body.heightCm);
    if (body.weightKg !== undefined) recordPatch.weight_kg = String(body.weightKg);
    if (body.city !== undefined) recordPatch.city = body.city;
    if (body.allergies !== undefined) recordPatch.allergies = body.allergies;
    if (body.chronicConditions !== undefined) recordPatch.chronic_conditions = body.chronicConditions;
    if (body.lifeStageMode !== undefined) recordPatch.life_stage_mode = body.lifeStageMode;
    if (body.currencyPreference !== undefined) recordPatch.currency_preference = body.currencyPreference;
    if (body.lutealPhaseDays !== undefined) recordPatch.luteal_phase_days = body.lutealPhaseDays;
    if (Object.keys(recordPatch).length > 0) {
      await this.supabase.admin.from('patient_records').update(recordPatch).eq('patient_id', patientId);
    }

    const { data: updatedProfile } = await this.supabase.admin.from('profiles').select().eq('id', patientId).maybeSingle();
    const { data: record } = await this.supabase.admin.from('patient_records').select().eq('patient_id', patientId).is('deleted_at', null).maybeSingle();

    return this.assemble(updatedProfile, record || null);
  }

  async getCycleLogs(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: logs } = await this.supabase.admin.from('cycle_logs').select().eq('patient_id', user.id).is('deleted_at', null).order('log_date', { ascending: false });
    return logs || [];
  }

  async getFertilityPrediction(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const [{ data: logs }, { data: record }] = await Promise.all([
      this.supabase.admin.from('cycle_logs').select('log_date, flow, bbt, lh_ratio, cervical_mucus').eq('patient_id', user.id).is('deleted_at', null).order('log_date', { ascending: true }),
      this.supabase.admin.from('patient_records').select('chronic_conditions, luteal_phase_days').eq('patient_id', user.id).is('deleted_at', null).maybeSingle(),
    ]);

    const pcosFlag = (record?.chronic_conditions || []).some((c: string) => /pcos|pcod/i.test(c));
    const biomarkerLogs = (logs || [])
      .filter((l: any) => l.bbt != null || l.lh_ratio != null || l.cervical_mucus != null)
      .map((l: any) => ({
        date: l.log_date,
        bbt: l.bbt != null ? Number(l.bbt) : undefined,
        lhRatio: l.lh_ratio != null ? Number(l.lh_ratio) : undefined,
        cervicalMucus: l.cervical_mucus,
      }));

    return computeFertilityPrediction(
      logs || [],
      pcosFlag,
      biomarkerLogs,
      record?.luteal_phase_days || 14,
    );
  }

  /** Quick calendar estimate from 3 manually-entered values, for patients who
   * don't have 2+ logged cycles yet. Also seeds cycle_logs for the reported
   * period days (without overwriting anything already logged) so this
   * contributes toward a real history-based prediction going forward. */
  async quickFertilityEstimate(user: AuthUser, body: QuickFertilityEstimateDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const rows = Array.from({ length: body.periodDurationDays }, (_, i) => ({
      patient_id: user.id,
      log_date: addDays(body.lastPeriodStart, i),
      flow: 'Medium',
      symptoms: [],
    }));
    await this.supabase.admin.from('cycle_logs').upsert(rows, { onConflict: 'patient_id,log_date', ignoreDuplicates: true });

    const { data: record } = await this.supabase.admin.from('patient_records').select('chronic_conditions, luteal_phase_days').eq('patient_id', user.id).is('deleted_at', null).maybeSingle();
    const pcosFlag = (record?.chronic_conditions || []).some((c: string) => /pcos|pcod/i.test(c));

    return computeQuickEstimate(
      body.lastPeriodStart,
      body.periodDurationDays,
      body.cycleLengthDays,
      pcosFlag,
      body.customLutealPhaseDays || record?.luteal_phase_days || 14,
    );
  }

  async logCycle(user: AuthUser, date: string, body: LogCycleDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    let { data: log } = await this.supabase.admin.from('cycle_logs').select().is('deleted_at', null).eq('patient_id', user.id).eq('log_date', date).maybeSingle();
    if (!log) {
      const { data: newLog } = await this.supabase.admin.from('cycle_logs').insert({ patient_id: user.id, log_date: date, symptoms: [], ...body }).select().is('deleted_at', null).maybeSingle();
      return newLog;
    } else {
      const { data: updatedLog } = await this.supabase.admin.from('cycle_logs').update(body).eq('id', log.id).select().is('deleted_at', null).maybeSingle();
      return updatedLog;
    }
  }

  async getVitals(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: logs } = await this.supabase.admin
      .from('vitals_logs')
      .select()
      .eq('patient_id', user.id)
      .order('logged_at', { ascending: false });

    const out: Record<string, { value: string; unit: string; loggedAt: Date; previousValue: string | null }> = {};
    (logs || []).forEach(l => {
      if (!out[l.vital_key]) {
        out[l.vital_key] = { value: l.value, unit: l.unit, loggedAt: l.logged_at, previousValue: null };
      } else if (out[l.vital_key].previousValue === null) {
        out[l.vital_key].previousValue = l.value;
      }
    });
    return out;
  }

  async logVital(user: AuthUser, key: string, body: LogVitalDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    if (!VITAL_KEYS.includes(key as VitalKey)) throw new BadRequestException(ERROR_MESSAGES.BAD_REQUEST);

    const { data: previous } = await this.supabase.admin
      .from('vitals_logs')
      .select()
      .eq('patient_id', user.id)
      .eq('vital_key', key)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: created } = await this.supabase.admin
      .from('vitals_logs')
      .insert({ patient_id: user.id, vital_key: key, value: body.value, unit: body.unit || '' })
      .select()
      .maybeSingle();

    return { value: created.value, unit: created.unit, loggedAt: created.logged_at, previousValue: previous?.value ?? null };
  }

  async getLifestyleLogs(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: logs } = await this.supabase.admin.from('lifestyle_logs').select().eq('patient_id', user.id).order('log_date', { ascending: false });
    return logs || [];
  }

  async logLifestyle(user: AuthUser, date: string, body: LogLifestyleDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const completedCount = Object.values(body.items).filter(Boolean).length;

    let { data: log } = await this.supabase.admin.from('lifestyle_logs').select().eq('patient_id', user.id).eq('log_date', date).maybeSingle();
    if (!log) {
      const { data: newLog } = await this.supabase.admin
        .from('lifestyle_logs')
        .insert({ patient_id: user.id, log_date: date, items: body.items, completed_count: completedCount })
        .select()
        .maybeSingle();
      return newLog;
    } else {
      const { data: updatedLog } = await this.supabase.admin
        .from('lifestyle_logs')
        .update({ items: body.items, completed_count: completedCount })
        .eq('id', log.id)
        .select()
        .maybeSingle();
      return updatedLog;
    }
  }

  async getCareConnections(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: connections } = await this.supabase.admin
      .from('care_connections')
      .select()
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });
    return connections || [];
  }

  async inviteConnection(user: AuthUser, body: InviteConnectionDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: existing } = await this.supabase.admin
      .from('care_connections')
      .select()
      .eq('patient_id', user.id)
      .eq('invitee_email', body.email)
      .maybeSingle();
    if (existing) throw new BadRequestException(ERROR_MESSAGES.CONNECTION_ALREADY_INVITED);

    const inviteeName = body.email
      .split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const { data: created } = await this.supabase.admin
      .from('care_connections')
      .insert({
        patient_id: user.id,
        invitee_email: body.email,
        invitee_name: inviteeName,
        relation: body.relation,
        permissions: { cycleWindow: true, appointments: false, detailedRx: false },
      })
      .select()
      .maybeSingle();

    return created;
  }

  private async findOwnConnection(user: AuthUser, id: string) {
    const { data: connection } = await this.supabase.admin.from('care_connections').select().eq('id', id).eq('patient_id', user.id).maybeSingle();
    if (!connection) throw new NotFoundException(ERROR_MESSAGES.CONNECTION_NOT_FOUND);
    return connection;
  }

  async updateConnectionPermissions(user: AuthUser, id: string, body: UpdateConnectionPermissionsDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    await this.findOwnConnection(user, id);

    const { data: updated } = await this.supabase.admin
      .from('care_connections')
      .update({ permissions: body.permissions })
      .eq('id', id)
      .select()
      .maybeSingle();
    return updated;
  }

  async removeConnection(user: AuthUser, id: string) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const connection = await this.findOwnConnection(user, id);

    await this.supabase.admin.from('care_connections').delete().eq('id', id);
    return connection;
  }

  async getFavorites(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: favorites } = await this.supabase.admin
      .from('doctor_favorites')
      .select()
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });
    return favorites || [];
  }

  async addFavorite(user: AuthUser, doctorId: string) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: existing } = await this.supabase.admin
      .from('doctor_favorites')
      .select()
      .eq('patient_id', user.id)
      .eq('doctor_id', doctorId)
      .maybeSingle();
    if (existing) throw new BadRequestException(ERROR_MESSAGES.FAVORITE_ALREADY_EXISTS);

    const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', doctorId).eq('role', ProfileRole.DOCTOR).maybeSingle();
    if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

    const { data: created } = await this.supabase.admin
      .from('doctor_favorites')
      .insert({ patient_id: user.id, doctor_id: doctorId })
      .select()
      .maybeSingle();
    return created;
  }

  async removeFavorite(user: AuthUser, doctorId: string) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: existing } = await this.supabase.admin.from('doctor_favorites').select().eq('patient_id', user.id).eq('doctor_id', doctorId).maybeSingle();
    if (!existing) throw new NotFoundException(ERROR_MESSAGES.FAVORITE_NOT_FOUND);

    await this.supabase.admin.from('doctor_favorites').delete().eq('id', existing.id);
    return existing;
  }

  async getWaitlist(user: AuthUser) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: entries } = await this.supabase.admin
      .from('appointment_waitlist')
      .select()
      .eq('patient_id', user.id)
      .eq('status', 'Waiting')
      .order('created_at', { ascending: false });
    if (!entries || !entries.length) return [];

    // Position = how many still-waiting entries for that doctor were created at or before this one.
    return Promise.all(entries.map(async entry => {
      const { count } = await this.supabase.admin
        .from('appointment_waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', entry.doctor_id)
        .eq('status', 'Waiting')
        .lte('created_at', entry.created_at);
      return { ...entry, position: count || 1 };
    }));
  }

  async joinWaitlist(user: AuthUser, body: JoinWaitlistDto) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', body.doctorId).eq('role', ProfileRole.DOCTOR).maybeSingle();
    if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

    const { data: created } = await this.supabase.admin
      .from('appointment_waitlist')
      .insert({ patient_id: user.id, doctor_id: body.doctorId, preferred_window: body.preferredWindow })
      .select()
      .maybeSingle();
    return created;
  }

  async leaveWaitlist(user: AuthUser, id: string) {
    if (user.profile.role !== ProfileRole.PATIENT) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data: entry } = await this.supabase.admin.from('appointment_waitlist').select().eq('id', id).eq('patient_id', user.id).maybeSingle();
    if (!entry) throw new NotFoundException(ERROR_MESSAGES.WAITLIST_ENTRY_NOT_FOUND);

    await this.supabase.admin.from('appointment_waitlist').delete().eq('id', id);
    return entry;
  }
}
