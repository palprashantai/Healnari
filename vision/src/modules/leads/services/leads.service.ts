import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { ConsultationRequestDto } from '@/modules/leads/controllers/leads.controller';

@Injectable()
export class LeadsService {
  constructor(private readonly supabase: SupabaseService) {}

  async subscribeNewsletter(email: string) {
    try {
      // Idempotent — resubscribing (or a duplicate double-click) shouldn't error.
      const { data } = await this.supabase.admin
        .from('newsletter_subscribers')
        .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
        .select()
        .maybeSingle();
      return data || { email };
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async createConsultationRequest(body: ConsultationRequestDto) {
    try {
      const { data } = await this.supabase.admin
        .from('consultation_requests')
        .insert({
          name: body.name,
          age: body.age,
          mobile: body.mobile,
          concern: body.concern,
          specialty_recommendation: body.specialtyRecommendation,
          preferred_date: body.preferredDate || null,
          preferred_time: body.preferredTime,
          notes: body.notes,
        })
        .select()
        .single();
      return data;
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
