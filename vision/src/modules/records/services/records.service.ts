import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreatePrescriptionDto } from '@/modules/records/controllers/records.controller';

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
}
