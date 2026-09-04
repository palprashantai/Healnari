import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Public } from '@/core/decorators/public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { LeadsService } from '@/modules/leads/services/leads.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';

export class NewsletterSubscribeDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;
}

export class CheckExistingUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mobile?: string;
}

export class CheckProviderEmailDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;
}

export class ProviderApplicationDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[0-9+\s\-()]{7,20}$/, {
    message: 'phone must be a valid contact number',
  })
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  regNo: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  medicalCouncil: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  specialty: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  experienceYears: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  consultationFee?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  clinicName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenseFileName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseFileSize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseFileType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseFileUrl?: string;
}

export class ConsultationRequestDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(100)
  age?: number;

  @ApiProperty()
  @Matches(/^[0-9+\s\-()]{7,20}$/, {
    message: 'mobile must be a valid contact number',
  })
  mobile: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  concern?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialtyRecommendation?: string;

  @ApiProperty({
    required: false,
    description:
      "A specific verified doctor the visitor picked — approving this request makes them that doctor's patient.",
  })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'preferredDate must be in YYYY-MM-DD format',
  })
  preferredDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM|am|pm)$/, {
    message: 'preferredTime must be in HH:MM AM/PM format',
  })
  preferredTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  fee?: number;
}

/** Public (unauthenticated) endpoints for the marketing site — newsletter
 * signup and the symptom-checker "book a consultation" flow — plus the
 * doctor-authenticated endpoints to review and approve requests addressed
 * to them. Approving is what actually creates the patient account (see
 * LeadsService.approveConsultationRequest); nothing here creates a real
 * appointment or account before that. */
@ApiTags('Leads')
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
  @ApiOperation({
    summary:
      'Submit a consultation request from the public symptom-checker / booking flow',
  })
  @Post('consultation-request')
  async createConsultationRequest(@Body() body: ConsultationRequestDto) {
    const data = await this.leadsService.createConsultationRequest(body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Public()
  @ApiOperation({
    summary:
      'Submit a specialist provider / doctor application from the public landing page',
  })
  @Post('provider-application')
  async submitProviderApplication(@Body() body: ProviderApplicationDto) {
    const data = await this.leadsService.submitProviderApplication(body);
    return ResponseHelper.success(
      data,
      'Application submitted successfully. Our credentialing team will review your details within 24 hours.',
    );
  }

  @Public()
  @ApiOperation({
    summary: 'Check if a provider email already exists or has a pending application',
  })
  @Post('check-provider-email')
  async checkProviderEmail(@Body() body: CheckProviderEmailDto) {
    const data = await this.leadsService.checkProviderEmail(body.email);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Public()
  @ApiOperation({ summary: 'Check if a user exists to autofill details' })
  @Post('check-existing')
  async checkExistingUser(@Body() body: CheckExistingUserDto) {
    const data = await this.leadsService.checkExistingUser(
      body.email,
      body.mobile,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('consultation-requests/mine')
  @ApiOperation({
    summary:
      'Consultation requests a visitor addressed to this doctor specifically (doctor only)',
  })
  async getMyConsultationRequests(@CurrentUser() user: AuthUser) {
    const data = await this.leadsService.getMyConsultationRequests(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('consultation-requests/:id/approve')
  @ApiOperation({
    summary:
      'Approve a consultation request — creates the real patient account + appointment and emails login credentials (doctor only)',
  })
  async approveConsultationRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const data = await this.leadsService.approveConsultationRequest(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Put('consultation-requests/:id/decline')
  @ApiOperation({
    summary:
      'Decline a consultation request addressed to this doctor (doctor only)',
  })
  async declineConsultationRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const data = await this.leadsService.declineConsultationRequest(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }
}
