import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

const STATIC_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM', '5:30 PM'];

@Injectable()
export class DoctorsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  async search(q?: string, specialty?: string) {
    let query = this.supabase.admin.from('profiles').select().eq('role', ProfileRole.DOCTOR);
    
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

  async verifyKyc(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    
    const { data: updated } = await this.supabase.admin.from('profiles').update({
      kyc_verified: true,
      kyc_submitted_at: new Date().toISOString(),
    }).eq('id', user.id).select().single();
    
    if (!updated) throw new NotFoundException();
    return updated;
  }

  async getAvailableSlots(doctorId: string, date: string) {
    const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', doctorId).eq('role', ProfileRole.DOCTOR).single();
    if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);
    return { doctorId, date, availableSlots: STATIC_SLOTS };
  }
}
