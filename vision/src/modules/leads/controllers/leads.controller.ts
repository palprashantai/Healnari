import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Max, Matches, Min } from 'class-validator';
import { Public } from '@/core/decorators/public.decorator';
import { LeadsService } from '@/modules/leads/services/leads.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';

export class NewsletterSubscribeDto {
  @ApiProperty() @IsEmail() email: string;
}

export class ConsultationRequestDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(12) @Max(100) age?: number;
  @ApiProperty() @Matches(/^[0-9]{10}$/, { message: 'mobile must be a valid 10-digit number' }) mobile: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() concern?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialtyRecommendation?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() preferredDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() preferredTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

/** Public (unauthenticated) endpoints for the marketing site — newsletter
 * signup and the symptom-checker "book a consultation" flow. Neither of
 * these creates a real appointment (there's no patient account yet); they
 * persist a real lead for the admin/care team to follow up on by phone,
 * instead of silently discarding what a visitor submits. */
@ApiTags('Leads (Public)')
@Controller('api/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @ApiOperation({ summary: 'Subscribe an email to the newsletter' })
  @Post('newsletter')
  async subscribeNewsletter(@Body() body: NewsletterSubscribeDto) {
    const data = await this.leadsService.subscribeNewsletter(body.email);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Public()
  @ApiOperation({ summary: 'Submit a consultation request from the public symptom-checker / booking flow' })
  @Post('consultation-request')
  async createConsultationRequest(@Body() body: ConsultationRequestDto) {
    const data = await this.leadsService.createConsultationRequest(body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }
}
