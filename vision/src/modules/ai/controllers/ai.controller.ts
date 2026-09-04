import {
  Body,
  Controller,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
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
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  patientName: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(130)
  age?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  chiefComplaint: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  symptoms?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  doctorNotes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  medications?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  labResults?: string[];
}

export class RxAutocompleteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  query: string;
}

export class AnalyzeLabDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  reportText: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reportName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cyclePhase?: string;
}

export class DrugInteractionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  medications: string[];
}

export class PrepareConsultDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  patientName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  doctorSpecialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  concerns?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  context?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  symptoms?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cycleContext?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  questions?: string[];
}

export class GenerateConsultSummaryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  patientName: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  doctorNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  assessment?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  prescriptions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  followUp?: string;
}

export class GenerateCmsArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  topic: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tone?: string;
}

export class TriageTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  userRole?: string;
}

export class AiChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  history?: any[];

  @IsOptional()
  @IsIn(['gemini', 'openai'])
  preferredProvider?: 'gemini' | 'openai';
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

  private async chargeCreditsIfAiGenerated(
    user: AuthUser,
    data: any,
    featureKey: AiFeatureKey,
    defaultCost: number,
    durationMs: number,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, any>,
    requestId?: string,
  ): Promise<{ creditsUsed: number; creditsRemaining: number; userPlan: string }> {
    const isAiGenerated = data?.isAiGenerated !== false;
    const sub = await this.subscriptionService.getSubscription(user);
    const cost = defaultCost;

    if (isAiGenerated) {
      const updatedSub = await this.subscriptionService.deductCredits(
        user,
        cost,
        requestId,
        featureKey,
        `AI Clinical Assistant: ${featureKey}`,
      );
      await this.usageService.logUsage({
        user_id: user.id,
        role: user.profile.role,
        feature: featureKey,
        model: 'gemini-1.5-flash',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        credits_deducted: cost,
        duration_ms: durationMs,
        response_status: 'success',
        metadata: { ...metadata, requestId },
      });
      return {
        creditsUsed: cost,
        creditsRemaining: updatedSub.creditsRemaining,
        userPlan: updatedSub.plan_id,
      };
    }

    // AI in fallback/mock mode — do not deduct credits or log successful billable AI usage
    return {
      creditsUsed: 0,
      creditsRemaining: Math.max(0, (sub.monthly_ai_credits || 0) - (sub.credits_used || 0)),
      userPlan: sub.plan_id,
    };
  }

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
        text: result.reply,
        toolsUsed: result.toolsExecuted,
        creditsRemaining: result.creditsRemaining,
        requestId: result.requestId,
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

    const billing = await this.chargeCreditsIfAiGenerated(
      user,
      data,
      AiFeatureKey.DOCTOR_SOAP_NOTES,
      1,
      durationMs,
      850,
      650,
      { patientName: body.patientName },
    );

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_SOAP_NOTES,
        creditsUsed: billing.creditsUsed,
        creditsRemaining: billing.creditsRemaining,
        userPlan: billing.userPlan,
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

    const billing = await this.chargeCreditsIfAiGenerated(
      user,
      data,
      AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE,
      1,
      durationMs,
      300,
      150,
      { query: body.query },
    );

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_RX_AUTOCOMPLETE,
        creditsUsed: billing.creditsUsed,
        creditsRemaining: billing.creditsRemaining,
        userPlan: billing.userPlan,
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
    if (
      user.profile.role !== ProfileRole.PATIENT &&
      user.profile.role !== ProfileRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only patients and administrators can access the AI lab report decoder.',
      );
    }

    const startTime = Date.now();
    const data = await this.aiService.analyzeLabReport(
      body.reportText,
      body.reportName,
      body.cyclePhase,
    );
    const durationMs = Date.now() - startTime;

    const billing = await this.chargeCreditsIfAiGenerated(
      user,
      data,
      AiFeatureKey.PATIENT_LAB_ANALYSIS,
      1,
      durationMs,
      1200,
      800,
      { reportName: body.reportName, cyclePhase: body.cyclePhase },
    );

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.PATIENT_LAB_ANALYSIS,
        creditsUsed: billing.creditsUsed,
        creditsRemaining: billing.creditsRemaining,
        userPlan: billing.userPlan,
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
    if (
      user.profile.role !== ProfileRole.PATIENT &&
      user.profile.role !== ProfileRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only patients and administrators can prepare patient consultation briefs.',
      );
    }

    const startTime = Date.now();
    const data = await this.aiService.prepareConsultation(body);
    const durationMs = Date.now() - startTime;

    const billing = await this.chargeCreditsIfAiGenerated(
      user,
      data,
      AiFeatureKey.PATIENT_CONSULT_PREP,
      1,
      durationMs,
      600,
      450,
      { doctorSpecialty: body.doctorSpecialty },
    );

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.PATIENT_CONSULT_PREP,
        creditsUsed: billing.creditsUsed,
        creditsRemaining: billing.creditsRemaining,
        userPlan: billing.userPlan,
        durationMs,
        disclaimer: user.profile.role === 'patient' ? PATIENT_DISCLAIMER : undefined,
      },
    };

    return ResponseHelper.success(envelope, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('patient-brief')
  @RequireAiFeature(AiFeatureKey.DOCTOR_PATIENT_BRIEF)
  @ApiOperation({
    summary:
      'AI Pre-Consultation Patient Brief & Diagnostic Synthesis for Doctors (Doctor Pro tier)',
  })
  async generatePatientBrief(
    @CurrentUser() user: AuthUser,
    @Body() body: PrepareConsultDto,
  ) {
    if (
      user.profile.role !== ProfileRole.DOCTOR &&
      user.profile.role !== ProfileRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only doctors and administrators can access clinical patient briefs.',
      );
    }

    const startTime = Date.now();
    const data = await this.aiService.prepareConsultation(body);
    const durationMs = Date.now() - startTime;

    const billing = await this.chargeCreditsIfAiGenerated(
      user,
      data,
      AiFeatureKey.DOCTOR_PATIENT_BRIEF,
      1,
      durationMs,
      600,
      450,
      { patientName: body.patientName },
    );

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_PATIENT_BRIEF,
        creditsUsed: billing.creditsUsed,
        creditsRemaining: billing.creditsRemaining,
        userPlan: billing.userPlan,
        durationMs,
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

    const billing = await this.chargeCreditsIfAiGenerated(
      user,
      data,
      AiFeatureKey.DOCTOR_CONSULT_SUMMARY,
      1,
      durationMs,
      800,
      500,
      { patientName: body.patientName },
    );

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_CONSULT_SUMMARY,
        creditsUsed: billing.creditsUsed,
        creditsRemaining: billing.creditsRemaining,
        userPlan: billing.userPlan,
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
    if (
      user.profile.role !== ProfileRole.DOCTOR &&
      user.profile.role !== ProfileRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only doctors and administrators can access the clinical drug safety shield.',
      );
    }

    const startTime = Date.now();
    const data = await this.aiService.checkDrugInteractions(body.medications);
    const durationMs = Date.now() - startTime;

    const billing = await this.chargeCreditsIfAiGenerated(
      user,
      data,
      AiFeatureKey.DOCTOR_DRUG_SAFETY,
      1,
      durationMs,
      400,
      300,
      { medicationsCount: body.medications.length },
    );

    const envelope: AiResponseEnvelope = {
      data,
      meta: {
        feature: AiFeatureKey.DOCTOR_DRUG_SAFETY,
        creditsUsed: billing.creditsUsed,
        creditsRemaining: billing.creditsRemaining,
        userPlan: billing.userPlan,
        durationMs,
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
