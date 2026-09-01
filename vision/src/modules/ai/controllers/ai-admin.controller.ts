import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AiFeatureFlagService } from '@/modules/ai/services/ai-feature-flag.service';
import { AiUsageService } from '@/modules/ai/services/ai-usage.service';
import { AiPromptService } from '@/modules/ai/services/ai-prompt.service';
import { AiAnalyticsService } from '@/modules/ai/services/ai-analytics.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';

export class UpdateAiFeatureDto {
  @IsOptional() @IsBoolean() is_enabled?: boolean;
  @IsOptional() @IsString() required_plan?: string | null;
  @IsOptional() @IsNumber() monthly_limit_free?: number | null;
  @IsOptional() @IsNumber() monthly_limit_premium?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) applicable_roles?: string[];
  @IsOptional() @IsNumber() credit_cost?: number;
}

export class SavePromptTemplateDto {
  @IsString() feature: string;
  @IsOptional() @IsString() role?: string;
  @IsString() system_prompt: string;
  @IsOptional() @IsString() user_prompt_template?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() temperature?: number;
  @IsOptional() @IsNumber() max_tokens?: number;
}

@ApiTags('Admin AI Control Center')
@Controller('api/admin/ai')
@UseGuards(SupabaseAuthGuard)
export class AiAdminController {
  constructor(
    private readonly featureFlagService: AiFeatureFlagService,
    private readonly usageService: AiUsageService,
    private readonly promptService: AiPromptService,
    private readonly analyticsService: AiAnalyticsService,
  ) {}

  private requireAdmin(user: AuthUser) {
    if (user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException('Admin credentials required to access AI control center.');
    }
  }

  @Get('features')
  @ApiOperation({ summary: 'List all dynamic AI feature flags and entitlement gates' })
  async getFeatureFlags(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    const flags = await this.featureFlagService.getAllFlags();
    return ResponseHelper.success(flags, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('features/:key')
  @ApiOperation({ summary: 'Update configuration or access gates for an AI feature' })
  async updateFeatureFlag(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() body: UpdateAiFeatureDto,
  ) {
    this.requireAdmin(user);
    const updated = await this.featureFlagService.updateFlag(key, body as any);
    return ResponseHelper.success(updated, 'AI Feature flag updated successfully.');
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI request volume and feature usage analytics' })
  async getUsageAnalytics(
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
  ) {
    this.requireAdmin(user);
    const stats = await this.usageService.getUsageStats(days ? Number(days) : 30);
    return ResponseHelper.success(stats, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('cost')
  @ApiOperation({ summary: 'Get AI unit cost, token economics, and gross margin dashboard' })
  async getCostDashboard(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    const dashboard = await this.usageService.getCostDashboard();
    return ResponseHelper.success(dashboard, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get AI paywall conversion funnel and doctor clinical metrics' })
  async getFunnelStats(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    const funnel = await this.analyticsService.getFunnelStats();
    return ResponseHelper.success(funnel, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('prompts')
  @ApiOperation({ summary: 'List all versioned prompt templates' })
  async getPromptTemplates(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    const prompts = await this.promptService.listAllTemplates();
    return ResponseHelper.success(prompts, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('prompts')
  @ApiOperation({ summary: 'Create or update a versioned AI prompt template' })
  async savePromptTemplate(
    @CurrentUser() user: AuthUser,
    @Body() body: SavePromptTemplateDto,
  ) {
    this.requireAdmin(user);
    const saved = await this.promptService.saveTemplate(body);
    return ResponseHelper.success(saved, 'AI Prompt template updated and versioned.');
  }
}
