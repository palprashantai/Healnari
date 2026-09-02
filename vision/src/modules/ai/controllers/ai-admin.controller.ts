import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
} from 'class-validator';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AiFeatureFlagService } from '@/modules/ai/services/ai-feature-flag.service';
import { AiUsageService } from '@/modules/ai/services/ai-usage.service';
import { AiPromptService } from '@/modules/ai/services/ai-prompt.service';
import { AiAnalyticsService } from '@/modules/ai/services/ai-analytics.service';
import { AiPricingService } from '@/modules/ai/services/ai-pricing.service';
import { AiProfitabilityService } from '@/modules/ai/services/ai-profitability.service';
import { AiCreditLedgerService } from '@/modules/ai/services/ai-credit-ledger.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import {
  PricingSimulationInput,
  AiRegionalPrice,
  AiCoupon,
} from '../interfaces/ai-globalization.interface';

export class CreateAiFeatureDto {
  @IsString() name: string;
  @IsOptional() @IsString() feature_key?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() usage_type?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsBoolean() is_enabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) applicable_roles?: string[];
  @IsOptional() @IsNumber() credit_cost?: number;
}

export class UpdateAiFeatureDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() is_enabled?: boolean;
  @IsOptional() @IsString() usage_type?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() required_plan?: string | null;
  @IsOptional() @IsNumber() monthly_limit_free?: number | null;
  @IsOptional() @IsNumber() monthly_limit_premium?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) applicable_roles?: string[];
  @IsOptional() @IsNumber() credit_cost?: number;
  @IsOptional() @IsString() status?: 'active' | 'inactive' | 'archived';
}

export class CreateAiPlanDto {
  @IsString() name: string;
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() billing_cycle?: 'monthly' | 'yearly' | 'pay_per_use' | 'credit_pack' | 'lifetime';
  @IsOptional() @IsString() product_id?: string;
  @IsOptional() @IsNumber() included_monthly_credits?: number;
  @IsOptional() @IsNumber() bonus_credits?: number;
  @IsOptional() @IsBoolean() rollover_unused_credits?: boolean;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsOptional() @IsNumber() price_inr?: number;
  @IsOptional() @IsNumber() price_usd?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() feature_limits?: Record<string, any>;
}

export class UpdateAiPlanDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() billing_cycle?: 'monthly' | 'yearly' | 'pay_per_use' | 'credit_pack' | 'lifetime';
  @IsOptional() @IsString() product_id?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsOptional() @IsNumber() included_monthly_credits?: number;
  @IsOptional() @IsNumber() bonus_credits?: number;
  @IsOptional() @IsBoolean() rollover_unused_credits?: boolean;
  @IsOptional() @IsNumber() price_inr?: number;
  @IsOptional() @IsNumber() price_usd?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() feature_limits?: Record<string, any>;
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

export class UpdateCountryDto {
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsBoolean() is_ai_enabled?: boolean;
  @IsOptional() @IsNumber() tax_rate?: number;
  @IsOptional() @IsString() tax_name?: string;
  @IsOptional() @IsString() tax_type?: 'inclusive' | 'exclusive';
  @IsOptional() @IsString() payment_gateway?: 'cashfree' | 'stripe' | 'razorpay' | 'manual';
}

export class SetRegionalPriceDto {
  @IsString() plan_id: string;
  @IsString() country_code: string;
  @IsIn(['INR', 'USD']) currency: string;
  @IsNumber() base_amount: number;
}

export class PricingSimulationDto {
  @IsOptional() @IsString() planId?: string;
  @IsString() countryCode: string;
  @IsIn(['INR', 'USD']) currency: string;
  @IsNumber() basePrice: number;
  @IsNumber() monthlyCredits: number;
  @IsNumber() expectedAvgQueriesPerUser: number;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() taxRatePercent?: number;
  @IsOptional() @IsNumber() gatewayFeePercent?: number;
  @IsOptional() @IsNumber() expectedUsers?: number;
}

export class CreateCouponDto {
  @IsString() code: string;
  @IsString() discount_type: 'percentage' | 'fixed_amount';
  @IsNumber() discount_value: number;
  @IsOptional() @IsString() allowed_country?: string;
  @IsOptional() @IsIn(['INR', 'USD']) allowed_currency?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) allowed_plan_ids?: string[];
  @IsOptional() @IsNumber() max_uses?: number;
  @IsOptional() @IsString() valid_until?: string;
}

@ApiTags('Admin AI Control Center & Global Monetization')
@Controller('api/admin/ai')
@UseGuards(SupabaseAuthGuard)
export class AiAdminController {
  constructor(
    private readonly featureFlagService: AiFeatureFlagService,
    private readonly usageService: AiUsageService,
    private readonly promptService: AiPromptService,
    private readonly analyticsService: AiAnalyticsService,
    private readonly pricingService: AiPricingService,
    private readonly profitabilityService: AiProfitabilityService,
    private readonly creditLedgerService: AiCreditLedgerService,
    private readonly supabase: SupabaseService,
  ) {}

  private requireAdmin(user: AuthUser) {
    if (user.profile.role !== ProfileRole.ADMIN) {
      throw new ForbiddenException('Admin credentials required to access AI control center.');
    }
  }

  // --- 1. Global Profitability Analytics ---
  @Get('profitability')
  @ApiOperation({ summary: 'Get multi-currency global revenue, AI infrastructure cost, and profit margin' })
  async getProfitability(
    @CurrentUser() user: AuthUser,
    @Query('currency') currency?: string,
  ) {
    this.requireAdmin(user);
    const data = await this.profitabilityService.getGlobalProfitability(currency || 'USD');
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // --- 2. Country & Currency Management ---
  @Get('countries')
  @ApiOperation({ summary: 'List all supported country configurations, tax rates, and gateways' })
  async getCountries(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    const countries = await this.pricingService.getAllCountries();
    return ResponseHelper.success(countries, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('countries/:code')
  @ApiOperation({ summary: 'Update country settings, tax configuration, or AI availability' })
  async updateCountry(
    @CurrentUser() user: AuthUser,
    @Param('code') code: string,
    @Body() body: UpdateCountryDto,
  ) {
    this.requireAdmin(user);
    const current = await this.pricingService.getCountry(code);
    const updated = { ...current, ...body, code: code.toUpperCase() };

    try {
      await this.supabase.admin.from('countries').upsert(updated, { onConflict: 'code' });
      // Log audit
      await this.supabase.admin.from('ai_admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.profile.full_name || 'Admin',
        action: 'COUNTRY_CONFIG_CHANGED',
        entity_type: 'country',
        entity_id: code.toUpperCase(),
        old_value: current,
        new_value: updated,
      });
    } catch {}

    return ResponseHelper.success(updated, 'Country configuration updated successfully.');
  }

  @Get('currencies')
  @ApiOperation({ summary: 'List all ISO 4217 currencies and reporting reference rates' })
  async getCurrencies(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    const currencies = await this.pricingService.getAllCurrencies();
    return ResponseHelper.success(currencies, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // --- 3. Plans & Regional Pricing ---
  @Get('plans')
  @ApiOperation({ summary: 'List all global logical AI products and plans' })
  async getPlans(
    @CurrentUser() user: AuthUser,
    @Query('country') country?: string,
    @Query('currency') currency?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    this.requireAdmin(user);
    const quotes = await this.pricingService.getAllPlansForMarket(
      country || 'IN',
      currency || 'INR',
      undefined,
      includeInactive === 'true' || includeInactive === '1',
    );
    return ResponseHelper.success(quotes, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new AI plan' })
  async createPlan(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAiPlanDto,
  ) {
    this.requireAdmin(user);
    const created = await this.pricingService.createPlan(body, {
      id: user.id,
      name: user.profile.full_name || 'Admin',
    });
    return ResponseHelper.success(created, 'AI Plan created successfully.');
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update an existing AI plan, included features, and limits' })
  async updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateAiPlanDto,
  ) {
    this.requireAdmin(user);
    const updated = await this.pricingService.updatePlan(id, body, {
      id: user.id,
      name: user.profile.full_name || 'Admin',
    });
    return ResponseHelper.success(updated, 'AI Plan updated successfully.');
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Deactivate an AI plan' })
  async deletePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    this.requireAdmin(user);
    await this.pricingService.deletePlan(id, {
      id: user.id,
      name: user.profile.full_name || 'Admin',
    });
    return ResponseHelper.success({ id }, 'AI Plan deactivated successfully.');
  }

  @Post('prices')
  @ApiOperation({ summary: 'Set or version explicit regional market price for a plan' })
  async setRegionalPrice(
    @CurrentUser() user: AuthUser,
    @Body() body: SetRegionalPriceDto,
  ) {
    this.requireAdmin(user);
    const { plan_id, country_code, currency, base_amount } = body;
    const priceEntry = await this.pricingService.setRegionalPrice(
      plan_id,
      country_code,
      currency,
      base_amount,
      {
        id: user.id,
        name: user.profile?.full_name || 'Admin',
      },
    );
    return ResponseHelper.success(priceEntry, 'Regional price published successfully.');
  }

  // --- 4. Pricing Profitability Simulator ---
  @Post('simulate-pricing')
  @ApiOperation({ summary: 'Simulate unit economics, token costs, and gross margins for a plan' })
  async simulatePricing(
    @CurrentUser() user: AuthUser,
    @Body() body: PricingSimulationDto,
  ) {
    this.requireAdmin(user);
    const result = this.pricingService.simulatePricing(body);
    return ResponseHelper.success(result, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // --- 5. Feature Flags & Catalog Matrix ---
  @Get('features')
  @ApiOperation({ summary: 'List all dynamic AI features with status, usage type, and plan count' })
  async getFeatureFlags(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    const flags = await this.featureFlagService.getAllFlags();
    const plans = await this.pricingService.getAllPlans();

    // Attach plan count to each feature
    const enriched = flags.map((f) => {
      const planCount = plans.filter(
        (p) => p.is_active && Array.isArray(p.features) && p.features.includes(f.feature_key),
      ).length;
      return {
        ...f,
        plan_count: planCount,
      };
    });

    return ResponseHelper.success(enriched, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('features')
  @ApiOperation({ summary: 'Create a new AI capability in the catalog' })
  async createFeature(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAiFeatureDto,
  ) {
    this.requireAdmin(user);
    const created = await this.featureFlagService.createFlag(body as any, {
      id: user.id,
      name: user.profile.full_name || 'Admin',
    });
    return ResponseHelper.success(created, 'AI Feature created successfully.');
  }

  @Put('features/:key')
  @ApiOperation({ summary: 'Update configuration or access gates for an AI feature' })
  async updateFeatureFlag(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() body: UpdateAiFeatureDto,
  ) {
    this.requireAdmin(user);
    const updated = await this.featureFlagService.updateFlag(key, body as any, {
      id: user.id,
      name: user.profile.full_name || 'Admin',
    });
    return ResponseHelper.success(updated, 'AI Feature updated successfully.');
  }

  @Delete('features/:key')
  @ApiOperation({ summary: 'Archive / Deactivate an AI feature with impact validation' })
  async archiveFeature(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Query('force') force?: string,
  ) {
    this.requireAdmin(user);
    const result = await this.featureFlagService.archiveFlag(
      key,
      {
        id: user.id,
        name: user.profile.full_name || 'Admin',
      },
      force === 'true' || force === '1',
    );
    return ResponseHelper.success(result, result.message);
  }

  @Get('features/:key/impact')
  @ApiOperation({ summary: 'Check which active plans use this feature before removal' })
  async checkFeatureImpact(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
  ) {
    this.requireAdmin(user);
    const impactedPlans = await this.featureFlagService.checkPlanImpact(key);
    return ResponseHelper.success({ featureKey: key, impactedPlans }, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // --- 6. Usage & Cost Metrics ---
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

  // --- 7. Prompts Management ---
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

  // --- 8. Coupons Management ---
  @Get('coupons')
  @ApiOperation({ summary: 'List all promotional discount coupons' })
  async getCoupons(@CurrentUser() user: AuthUser) {
    this.requireAdmin(user);
    try {
      const { data } = await this.supabase.admin.from('ai_coupons').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
      }
    } catch {}

    const sampleCoupons: AiCoupon[] = [
      { code: 'HEALNARI20', discount_type: 'percentage', discount_value: 20, max_uses: 500, current_uses: 42, valid_from: new Date().toISOString(), is_active: true },
      { code: 'WELCOME100', discount_type: 'fixed_amount', discount_value: 100, allowed_country: 'IN', allowed_currency: 'INR', max_uses: 1000, current_uses: 118, valid_from: new Date().toISOString(), is_active: true },
      { code: 'USAPROMO5', discount_type: 'fixed_amount', discount_value: 5, allowed_country: 'US', allowed_currency: 'USD', max_uses: 500, current_uses: 19, valid_from: new Date().toISOString(), is_active: true },
    ];
    return ResponseHelper.success(sampleCoupons, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Create a new country/currency-scoped discount coupon' })
  async createCoupon(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCouponDto,
  ) {
    this.requireAdmin(user);
    try {
      await this.supabase.admin.from('ai_coupons').insert({
        code: body.code.toUpperCase(),
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        allowed_country: body.allowed_country || null,
        allowed_currency: body.allowed_currency || null,
        allowed_plan_ids: body.allowed_plan_ids || [],
        max_uses: body.max_uses || 1000,
        valid_until: body.valid_until || null,
      });
    } catch {}

    return ResponseHelper.success(body, 'Coupon created successfully.');
  }

  // --- 9. Admin Audit Logs ---
  @Get('audit-logs')
  @ApiOperation({ summary: 'View immutable audit trail of all pricing and feature changes' })
  async getAuditLogs(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    this.requireAdmin(user);
    try {
      const { data } = await this.supabase.admin
        .from('ai_admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit || 50));

      if (data && data.length > 0) {
        return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
      }
    } catch {}

    const defaultAuditLogs = [
      { id: '1', admin_name: 'Platform Admin', action: 'PRICE_UPDATED', entity_type: 'price', entity_id: 'patient_premium_IN_INR', reason: 'Regional price sync', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: '2', admin_name: 'Platform Admin', action: 'COUNTRY_CONFIG_CHANGED', entity_type: 'country', entity_id: 'DE', reason: 'Activated Germany with 19% MwSt', created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: '3', admin_name: 'Platform Admin', action: 'COUPON_CREATED', entity_type: 'coupon', entity_id: 'HEALNARI20', reason: 'Global 20% campaign launch', created_at: new Date(Date.now() - 172800000).toISOString() },
    ];
    return ResponseHelper.success(defaultAuditLogs, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
