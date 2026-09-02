import {
  Body,
  Controller,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { AiService } from '@/modules/ai/services/ai.service';
import { AiUsageService } from '@/modules/ai/services/ai-usage.service';
import { AiSubscriptionService } from '@/modules/ai/services/ai-subscription.service';
import { AiEntitlementService } from '@/modules/ai/services/ai-entitlement.service';
import { AiOrchestrator } from '@/modules/ai/services/ai-orchestrator.service';
import { AiEntitlementGuard } from '@/modules/ai/guards/ai-entitlement.guard';
import { RequireAiFeature } from '@/modules/ai/decorators/require-ai-feature.decorator';
import {
  AiFeatureKey,
  AiResponseEnvelope,
} from '@/modules/ai/interfaces/ai-monetization.interface';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';

const PATIENT_DISCLAIMER =
  'This is AI-generated health information for educational purposes only. It is not a clinical diagnosis or medical advice. Always consult your doctor for medical decisions.';

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

export class PrepareConsultDto {
  @IsString() patientName: string;
  @IsOptional() @IsString() doctorSpecialty?: string;
  @IsOptional() @IsString() doctorName?: string;
  @IsOptional() @IsString() concerns?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) symptoms?: string[];
  @IsOptional() @IsString() cycleContext?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) questions?: string[];
}

export class GenerateConsultSummaryDto {
  @IsString() patientName: string;
  @IsOptional() @IsString() doctorNotes?: string;
  @IsOptional() @IsString() assessment?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) prescriptions?: string[];
  @IsOptional() @IsString() followUp?: string;
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

export class AiChatDto {
  @IsString() message: string;
  @IsOptional() @IsArray() history?: any[];
  @IsOptional() @IsString() preferredProvider?: 'gemini' | 'openai';
}

@ApiTags('AI Clinical & Operational Intelligence')
@Controller('api/ai')
@UseGuards(SupabaseAuthGuard, AiEntitlementGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usageService: AiUsageService,
    private readonly subscriptionService: AiSubscriptionService,
    private readonly entitlementService: AiEntitlementService,
    private readonly orchestrator: AiOrchestrator,
  ) {}

  @Post('chat')
  @ApiOperation({
    summary:
      'Universal Function-Calling AI Assistant for Patients & Doctors',
  })
  async chat(
    @CurrentUser() user: AuthUser,
    @Body() body: AiChatDto,
  ) {
    const result = await this.orchestrator.processChat({
      message: body.message,
      history: body.history,
      user,
      preferredProvider: body.preferredProvider,
    });

    return ResponseHelper.success(
      {
        reply: result.reply,
        history: result.history,
        toolsUsed: result.toolsExecuted,
        creditsRemaining: result.creditsRemaining,
        requestId: result.requestId,
        metadata: {
          feature:
            user.profile.role === ProfileRole.DOCTOR
              ? AiFeatureKey.DOCTOR_PATIENT_BRIEF
              : AiFeatureKey.PATIENT_CHAT,
          model: body.preferredProvider || 'gemini',
          tokensUsed: result.tokensUsed,
          estimatedCostUsd: result.estimatedCostUsd,
          disclaimer:
            user.profile.role === ProfileRole.PATIENT ? PATIENT_DISCLAIMER : undefined,
        },
      },
      SUCCESS_MESSAGES.DATA_RETRIEVED,
    );
  }

  @Post('soap-notes')
  @RequireAiFeature(AiFeatureKey.DOCTOR_SOAP_NOTES)
  @ApiOperation({
    summary:
      'Generate structured SOAP clinical notes from teleconsultation details (Doctor Pro tier)',
  })
  async generateSoapNotes(
    @CurrentUser() user: AuthUser,
    @Body() body: GenerateSoapDto,
  ) {
    if (
      user.profile.role !== ProfileRole.DOCTOR &&
      user.profile.role !== ProfileRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only verified doctors can generate clinical SOAP notes.',
      );
    }

    const startTime = Date.now();
    const data = await this.aiService.generateSoapNotes(body);
    const durationMs = Date.now() - startTime;

    // Deduct credit & log usage
    const sub = await this.subscriptionService.deductCredits(user, 2);
    await this.usageService.logUsage({
      user_id: user.id,
      role: 'doctor',
      feature: AiFeatureKey.DOCTOR_SOAP_NOTES,
      model: 'gemini-1.5-flash',
      input_tokens: 850,
      output_tokens: 650,
      credits_deducted: 2,
      duration_ms: durationMs,
      response_status: 'success',
      metadata: { patientName: body.patientName },
    });

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_SOAP_NOTES,
        creditsUsed: 2,
        creditsRemaining: Math.max(0, sub.monthly_ai_credits - sub.credits_used),
        userPlan: sub.plan_id,
        durationMs,
        model: 'gemini-1.5-flash',
      },
    };

    return ResponseHelper.success(envelope, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('rx-autocomplete')
  @RequireAiFeature(AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE)
  @ApiOperation({
    summary:
      'Smart prescription auto-completer for dosage, frequency, and duration',
  })
  async rxAutocomplete(
    @CurrentUser() user: AuthUser,
    @Body() body: RxAutocompleteDto,
  ) {
    if (
      user.profile.role !== ProfileRole.DOCTOR &&
      user.profile.role !== ProfileRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only doctors can access prescription auto-completion.',
      );
    }

    const startTime = Date.now();
    const data = await this.aiService.autoCompletePrescription(body.query);
    const durationMs = Date.now() - startTime;

    const sub = await this.subscriptionService.deductCredits(user, 1);
    await this.usageService.logUsage({
      user_id: user.id,
      role: 'doctor',
      feature: AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE,
      model: 'gemini-1.5-flash',
      input_tokens: 300,
      output_tokens: 150,
      credits_deducted: 1,
      duration_ms: durationMs,
      response_status: 'success',
      metadata: { query: body.query },
    });

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE,
        creditsUsed: 1,
        creditsRemaining: Math.max(0, sub.monthly_ai_credits - sub.credits_used),
        userPlan: sub.plan_id,
        durationMs,
      },
    };

    return ResponseHelper.success(envelope, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('lab-analysis')
  @RequireAiFeature(AiFeatureKey.PATIENT_LAB_ANALYSIS)
  @ApiOperation({
    summary:
      'Plain-English lab report analyzer and biomarker decoder with cycle phase calibration (Patient Premium)',
  })
  async analyzeLabReport(
    @CurrentUser() user: AuthUser,
    @Body() body: AnalyzeLabDto,
  ) {
    const startTime = Date.now();
    const data = await this.aiService.analyzeLabReport(
      body.reportText,
      body.reportName,
      body.cyclePhase,
    );
    const durationMs = Date.now() - startTime;

    const sub = await this.subscriptionService.deductCredits(user, 2);
    await this.usageService.logUsage({
      user_id: user.id,
      role: user.profile.role,
      feature: AiFeatureKey.PATIENT_LAB_ANALYSIS,
      model: 'gemini-1.5-flash',
      input_tokens: 1200,
      output_tokens: 800,
      credits_deducted: 2,
      duration_ms: durationMs,
      response_status: 'success',
      metadata: { reportName: body.reportName, cyclePhase: body.cyclePhase },
    });

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.PATIENT_LAB_ANALYSIS,
        creditsUsed: 2,
        creditsRemaining: Math.max(0, sub.monthly_ai_credits - sub.credits_used),
        userPlan: sub.plan_id,
        durationMs,
        disclaimer: PATIENT_DISCLAIMER,
      },
    };

    return ResponseHelper.success(envelope, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('consult-prep')
  @RequireAiFeature(AiFeatureKey.PATIENT_CONSULT_PREP)
  @ApiOperation({
    summary:
      'Personalized Patient Pre-Consultation Preparation Brief and Doctor Questions (Patient Premium)',
  })
  async prepareConsultation(
    @CurrentUser() user: AuthUser,
    @Body() body: PrepareConsultDto,
  ) {
    const startTime = Date.now();
    const data = await this.aiService.prepareConsultation(body);
    const durationMs = Date.now() - startTime;

    const sub = await this.subscriptionService.deductCredits(user, 1);
    await this.usageService.logUsage({
      user_id: user.id,
      role: user.profile.role,
      feature: AiFeatureKey.PATIENT_CONSULT_PREP,
      model: 'gemini-1.5-flash',
      input_tokens: 600,
      output_tokens: 450,
      credits_deducted: 1,
      duration_ms: durationMs,
      response_status: 'success',
      metadata: { doctorSpecialty: body.doctorSpecialty },
    });

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.PATIENT_CONSULT_PREP,
        creditsUsed: 1,
        creditsRemaining: Math.max(0, sub.monthly_ai_credits - sub.credits_used),
        userPlan: sub.plan_id,
        durationMs,
        disclaimer: PATIENT_DISCLAIMER,
      },
    };

    return ResponseHelper.success(envelope, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('consult-summary')
  @RequireAiFeature(AiFeatureKey.DOCTOR_CONSULT_SUMMARY)
  @ApiOperation({
    summary:
      'AI Post-Consultation Summary and Patient Action Plan Generator (Doctor Pro tier)',
  })
  async generateConsultSummary(
    @CurrentUser() user: AuthUser,
    @Body() body: GenerateConsultSummaryDto,
  ) {
    if (
      user.profile.role !== ProfileRole.DOCTOR &&
      user.profile.role !== ProfileRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only doctors can generate clinical consultation summaries.',
      );
    }

    const startTime = Date.now();
    const data = await this.aiService.generateConsultSummary(body);
    const durationMs = Date.now() - startTime;

    const sub = await this.subscriptionService.deductCredits(user, 1);
    await this.usageService.logUsage({
      user_id: user.id,
      role: 'doctor',
      feature: AiFeatureKey.DOCTOR_CONSULT_SUMMARY,
      model: 'gemini-1.5-flash',
      input_tokens: 800,
      output_tokens: 500,
      credits_deducted: 1,
      duration_ms: durationMs,
      response_status: 'success',
      metadata: { patientName: body.patientName },
    });

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_CONSULT_SUMMARY,
        creditsUsed: 1,
        creditsRemaining: Math.max(0, sub.monthly_ai_credits - sub.credits_used),
        userPlan: sub.plan_id,
        durationMs,
      },
    };

    return ResponseHelper.success(envelope, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('drug-interactions')
  @RequireAiFeature(AiFeatureKey.DOCTOR_DRUG_SAFETY)
  @ApiOperation({
    summary: 'Food-drug interaction safety shield and optimal timing advisor',
  })
  async checkDrugInteractions(
    @CurrentUser() user: AuthUser,
    @Body() body: DrugInteractionsDto,
  ) {
    const startTime = Date.now();
    const data = await this.aiService.checkDrugInteractions(body.medications);
    const durationMs = Date.now() - startTime;

    const sub = await this.subscriptionService.deductCredits(user, 1);
    await this.usageService.logUsage({
      user_id: user.id,
      role: user.profile.role,
      feature: AiFeatureKey.DOCTOR_DRUG_SAFETY,
      model: 'gemini-1.5-flash',
      input_tokens: 400,
      output_tokens: 300,
      credits_deducted: 1,
      duration_ms: durationMs,
      response_status: 'success',
      metadata: { medicationsCount: body.medications.length },
    });

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_DRUG_SAFETY,
        creditsUsed: 1,
        creditsRemaining: Math.max(0, sub.monthly_ai_credits - sub.credits_used),
        userPlan: sub.plan_id,
        durationMs,
        disclaimer: user.profile.role === 'patient' ? PATIENT_DISCLAIMER : undefined,
      },
    };

    return ResponseHelper.success(envelope, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('cms-article')
  @ApiOperation({ summary: 'AI Health Education Article Draft Generator' })
  async generateCmsArticle(
    @CurrentUser() user: AuthUser,
    @Body() body: GenerateCmsArticleDto,
  ) {
    if (user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can generate CMS articles.',
      );
    }
    const data = await this.aiService.generateCmsArticle(
      body.topic,
      body.category,
      body.tone,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('ticket-triage')
  @ApiOperation({
    summary: 'AI Support Ticket Triager & Draft Reply Assistant',
  })
  async triageTicket(
    @CurrentUser() user: AuthUser,
    @Body() body: TriageTicketDto,
  ) {
    if (user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can triage support tickets.',
      );
    }
    const data = await this.aiService.triageSupportTicket(body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
