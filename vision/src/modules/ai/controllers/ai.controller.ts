import { Body, Controller, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { AiService } from '@/modules/ai/services/ai.service';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';

export class GenerateSoapDto {
  @IsString() patientName: string;
  @IsOptional() @IsNumber() age?: number;
  @IsString() chiefComplaint: string;
  @IsOptional() @IsArray() @IsString({ each: true }) symptoms?: string[];
  @IsOptional() @IsString() doctorNotes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) medications?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) chronicConditions?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) labResults?: string[];
}

export class RxAutocompleteDto {
  @IsString() query: string;
}

export class AnalyzeLabDto {
  @IsString() reportText: string;
  @IsOptional() @IsString() reportName?: string;
  @IsOptional() @IsString() cyclePhase?: string;
}

export class DrugInteractionsDto {
  @IsArray() @IsString({ each: true }) medications: string[];
}

export class GenerateCmsArticleDto {
  @IsString() topic: string;
  @IsString() category: string;
  @IsOptional() @IsString() tone?: string;
}

export class TriageTicketDto {
  @IsString() subject: string;
  @IsString() message: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() userRole?: string;
}

@ApiTags('AI Clinical & Operational Intelligence')
@Controller('api/ai')
@UseGuards(SupabaseAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('soap-notes')
  @ApiOperation({ summary: 'Generate structured SOAP clinical notes from teleconsultation details' })
  async generateSoapNotes(@CurrentUser() user: AuthUser, @Body() body: GenerateSoapDto) {
    if (user.profile.role !== ProfileRole.DOCTOR && user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException('Only doctors can generate clinical SOAP notes.');
    }
    const data = await this.aiService.generateSoapNotes(body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('rx-autocomplete')
  @ApiOperation({ summary: 'Smart prescription auto-completer for dosage, frequency, and duration' })
  async rxAutocomplete(@CurrentUser() user: AuthUser, @Body() body: RxAutocompleteDto) {
    if (user.profile.role !== ProfileRole.DOCTOR && user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException('Only doctors can access prescription auto-completion.');
    }
    const data = await this.aiService.autoCompletePrescription(body.query);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('lab-analysis')
  @ApiOperation({ summary: 'Plain-English lab report analyzer and biomarker decoder with cycle phase calibration' })
  async analyzeLabReport(@CurrentUser() user: AuthUser, @Body() body: AnalyzeLabDto) {
    const data = await this.aiService.analyzeLabReport(body.reportText, body.reportName, body.cyclePhase);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('drug-interactions')
  @ApiOperation({ summary: 'Food-drug interaction safety shield and optimal timing advisor' })
  async checkDrugInteractions(@CurrentUser() user: AuthUser, @Body() body: DrugInteractionsDto) {
    const data = await this.aiService.checkDrugInteractions(body.medications);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('cms-article')
  @ApiOperation({ summary: 'AI Health Education Article Draft Generator' })
  async generateCmsArticle(@CurrentUser() user: AuthUser, @Body() body: GenerateCmsArticleDto) {
    if (user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException('Only administrators can generate CMS articles.');
    }
    const data = await this.aiService.generateCmsArticle(body.topic, body.category, body.tone);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('ticket-triage')
  @ApiOperation({ summary: 'AI Support Ticket Triager & Draft Reply Assistant' })
  async triageTicket(@CurrentUser() user: AuthUser, @Body() body: TriageTicketDto) {
    if (user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException('Only administrators can triage support tickets.');
    }
    const data = await this.aiService.triageSupportTicket(body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
