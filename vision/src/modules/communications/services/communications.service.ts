import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateBroadcastDto } from '@/modules/communications/controllers/communications.controller';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  async list(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    const { data } = await this.supabase.admin.from('broadcasts').select().eq('doctor_id', user.id).order('created_at', { ascending: false });
    return data || [];
  }

  async create(user: AuthUser, body: CreateBroadcastDto) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const scheduled = body.scheduleType === 'scheduled';
    const { data } = await this.supabase.admin.from('broadcasts').insert({
      doctor_id: user.id,
      subject: body.subject,
      body: body.body,
      audience: body.audience,
      channels: body.channels,
      status: scheduled ? 'Scheduled' : 'Sent',
      scheduled_for: scheduled ? body.scheduledFor : null,
    }).select().single();
    return data;
  }
}
