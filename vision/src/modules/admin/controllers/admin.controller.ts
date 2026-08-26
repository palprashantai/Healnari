import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { AdminService } from '@/modules/admin/services/admin.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { Public } from '@/core/decorators/public.decorator';

export class UpdateVerificationDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status: string;
}
export class ResolveTicketDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resolution?: string;
}
export class CmsArticleDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() author: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() summary?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() content?: string;
  @ApiProperty({ enum: ['Draft', 'Published', 'Archived'], required: false })
  @IsOptional()
  @IsIn(['Draft', 'Published', 'Archived'])
  status?: string;
}
export class UpdateCmsArticleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() author?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() summary?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() content?: string;
  @ApiProperty({ enum: ['Draft', 'Published', 'Archived'], required: false })
  @IsOptional()
  @IsIn(['Draft', 'Published', 'Archived'])
  status?: string;
}
export class UpdateLandingSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroTitle?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroSubtitle?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  providerHeroTitle?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  providerHeroSubtitle?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pricingAmount?: number;
  @ApiProperty({ required: false }) @IsOptional() toggles?: any;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  promoText?: string;
}
export class MessageTemplateDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() content: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() subject?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() slug?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ enum: ['email', 'whatsapp', 'push'], required: false })
  @IsOptional()
  @IsIn(['email', 'whatsapp', 'push'])
  type?: string;
  @ApiProperty({ enum: ['General', 'Patient', 'Doctor'], required: false })
  @IsOptional()
  @IsIn(['General', 'Patient', 'Doctor'])
  audience?: string;
}
export class BroadcastDto {
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() audience: string;
  @ApiProperty() @IsString() body: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  scheduleAt?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];
  @ApiProperty({
    required: false,
    type: [String],
    description:
      'Target these specific profile ids instead of resolving `audience` (e.g. a checkbox selection on Users.jsx/DoctorManager.jsx)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
export class GenerateReportDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() type: string;
}
export class NotifyUserDto {
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() message: string;
}
export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['Active', 'Suspended'] })
  @IsIn(['Active', 'Suspended'])
  status: string;
}
export class UpdateCommissionDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;
}
export class UpdateLeadStatusDto {
  @ApiProperty({ enum: ['New', 'Contacted', 'Converted', 'Closed'] })
  @IsIn(['New', 'Contacted', 'Converted', 'Closed'])
  status: string;
}

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdmin(user: AuthUser) {
    if (user.profile.role !== ProfileRole.ADMIN)
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  // ─── Dashboard ────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Platform stats (KPI cards)' })
  @ApiQuery({
    name: 'reportingCurrency',
    required: false,
    enum: ['USD', 'INR', 'AED', 'EUR', 'GBP'],
  })
  async getStats(
    @CurrentUser() user: AuthUser,
    @Query('reportingCurrency') reportingCurrency?: string,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.getDashboardStats(
      reportingCurrency || 'USD',
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('system-health')
  @ApiOperation({ summary: 'System health status' })
  async getSystemHealth(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getSystemHealth();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // ─── Compliance & Audit ──────────────────────────────────────────
  @Get('audit-logs')
  @ApiOperation({ summary: 'PHI access audit logs' })
  async getAuditLogs(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getPhiAuditLogs();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // ─── Users ────────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'All platform users (patients), paginated' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getUsers(
    @CurrentUser() user: AuthUser,
    @Query('role') role?: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') search?: string,
  ) {
    this.checkAdmin(user);
    const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(limitRaw ?? '50', 10) || 50),
    );
    const { users, total } = await this.adminService.getAllUsers(
      role,
      page,
      limit,
      search,
    );
    return ResponseHelper.paginated(
      users,
      total,
      page,
      limit,
      SUCCESS_MESSAGES.DATA_RETRIEVED,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Single user detail' })
  async getUserById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.checkAdmin(user);
    const data = await this.adminService.getUserById(id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Suspend or activate a user' })
  async updateUserStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateUserStatus(id, body.status);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Doctors / Clinics ────────────────────────────────────────────
  @Get('clinics')
  @ApiOperation({ summary: 'All registered doctors / clinics' })
  async getClinics(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getDoctorsAndClinics();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('clinics/:id')
  @ApiOperation({ summary: 'Single doctor/clinic detail with appointments' })
  async getDoctorDetail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.getDoctorDetail(id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('clinics/:id/commission')
  @ApiOperation({ summary: 'Update doctor commission rate' })
  async updateCommission(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateCommissionDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateDoctorCommission(
      id,
      body.commissionRate,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Verifications ────────────────────────────────────────────────
  @Get('verifications')
  @ApiOperation({ summary: 'Pending doctor KYC verifications' })
  async getPendingVerifications(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getPendingVerifications();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('verifications/:id')
  @ApiOperation({ summary: 'Approve or reject a doctor verification' })
  async updateVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateVerificationDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateDoctorVerification(
      user,
      id,
      body.status,
    );
    const msg =
      body.status === 'approved'
        ? SUCCESS_MESSAGES.VERIFICATION_APPROVED
        : SUCCESS_MESSAGES.VERIFICATION_REJECTED;
    return ResponseHelper.success(data, msg);
  }

  // ─── Tickets ──────────────────────────────────────────────────────
  @Get('tickets')
  @ApiOperation({ summary: 'All support tickets' })
  async getTickets(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getSupportTickets();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('tickets/:id/resolve')
  @ApiOperation({ summary: 'Resolve a support ticket' })
  async resolveTicket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.checkAdmin(user);
    const data = await this.adminService.resolveTicket(user, Number(id));
    return ResponseHelper.success(data, SUCCESS_MESSAGES.TICKET_RESOLVED);
  }

  // ─── Refunds ──────────────────────────────────────────────────────
  @Get('refunds')
  @ApiOperation({ summary: 'All refund requests' })
  async getRefunds(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getRefundRequests();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('refunds/:id/process')
  @ApiOperation({ summary: 'Process a refund' })
  async processRefund(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.checkAdmin(user);
    const data = await this.adminService.processRefund(user, Number(id));
    return ResponseHelper.success(data, SUCCESS_MESSAGES.REFUND_INITIATED);
  }

  // ─── Revenue ──────────────────────────────────────────────────────
  @Get('revenue')
  @ApiOperation({ summary: 'Platform revenue insights and payout requests' })
  @ApiQuery({
    name: 'reportingCurrency',
    required: false,
    enum: ['USD', 'INR', 'AED', 'EUR', 'GBP'],
  })
  async getRevenue(
    @CurrentUser() user: AuthUser,
    @Query('reportingCurrency') reportingCurrency?: string,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.getRevenueData(
      reportingCurrency || 'USD',
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('revenue/payouts')
  @ApiOperation({ summary: 'Doctor payout requests' })
  async getPayouts(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getPayoutRequests();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('revenue/payouts/:id/process')
  @ApiOperation({ summary: 'Mark a payout as processed' })
  async processPayout(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { referenceId: string },
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.processPayout(
      user,
      id,
      body.referenceId,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Reports ──────────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Platform analytics & generated reports history' })
  async getReports(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getPlatformReports();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a new report' })
  async generateReport(
    @CurrentUser() user: AuthUser,
    @Body() body: GenerateReportDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.generateReport(body.name, body.type);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // ─── CMS Articles ─────────────────────────────────────────────────
  @Get('cms')
  @ApiOperation({ summary: 'All CMS articles / content' })
  async getCmsContent(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getCmsArticles();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('cms')
  @ApiOperation({ summary: 'Create a CMS article' })
  async createCmsArticle(
    @CurrentUser() user: AuthUser,
    @Body() body: CmsArticleDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.createCmsArticle(body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Put('cms/:id/status')
  @ApiOperation({ summary: 'Toggle CMS article status (publish/unpublish)' })
  async toggleCmsStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateCmsArticleStatus(
      id,
      body.status,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Put('cms/:id')
  @ApiOperation({ summary: 'Update a CMS article' })
  async updateCmsArticle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateCmsArticleDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateCmsArticle(id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Delete('cms/:id')
  @ApiOperation({ summary: 'Delete a CMS article' })
  async deleteCmsArticle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    this.checkAdmin(user);
    await this.adminService.deleteCmsArticle(id);
    return ResponseHelper.success(null, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Landing Settings ─────────────────────────────────────────────
  @Get('landing-settings')
  @ApiOperation({ summary: 'Get landing page settings' })
  async getLandingSettings(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getLandingSettings();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('landing-settings')
  @ApiOperation({ summary: 'Update landing page settings' })
  async updateLandingSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLandingSettingsDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateLandingSettings(dto);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Public()
  @Get('public/landing-settings')
  @ApiOperation({ summary: 'Get landing page settings (Public)' })
  async getPublicLandingSettings() {
    return this.adminService.getLandingSettings();
  }

  // ─── Message Templates ────────────────────────────────────────────
  @Get('communications/templates')
  @ApiOperation({ summary: 'All message templates' })
  async getTemplates(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getMessageTemplates();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('communications/templates')
  @ApiOperation({ summary: 'Create a message template' })
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() body: MessageTemplateDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.createMessageTemplate(body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Put('communications/templates/:id')
  @ApiOperation({ summary: 'Update a message template' })
  async updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: MessageTemplateDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateMessageTemplate(id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Delete('communications/templates/:id')
  @ApiOperation({ summary: 'Delete a message template' })
  async deleteTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.checkAdmin(user);
    await this.adminService.deleteMessageTemplate(id);
    return ResponseHelper.success(null, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Public Doctors Listing ──────────────────────────────────────────
  @Public()
  @Get('public/doctors')
  @ApiOperation({ summary: 'Get verified doctors for landing page (Public)' })
  async getPublicDoctors() {
    const data = await this.adminService.getPublicDoctors();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  // ─── Specialties Management ─────────────────────────────────────────
  @Public()
  @Get('public/specialties')
  @ApiOperation({ summary: 'Get all specialties (Public)' })
  async getPublicSpecialties() {
    const data = await this.adminService.getSpecialties();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('specialties')
  @ApiOperation({ summary: 'Get all specialties' })
  async getSpecialties(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getSpecialties();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('specialties')
  @ApiOperation({ summary: 'Create a specialty' })
  async createSpecialty(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string },
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.createSpecialty(body.name);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Put('specialties/:id')
  @ApiOperation({ summary: 'Update a specialty' })
  async updateSpecialty(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateSpecialty(id, body.name);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Delete('specialties/:id')
  @ApiOperation({ summary: 'Delete a specialty' })
  async deleteSpecialty(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    this.checkAdmin(user);
    await this.adminService.deleteSpecialty(id);
    return ResponseHelper.success(null, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Broadcasts ───────────────────────────────────────────────────
  @Get('communications/broadcasts')
  @ApiOperation({ summary: 'Broadcast history' })
  async getBroadcasts(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getBroadcastHistory();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Post('communications/broadcasts')
  @ApiOperation({ summary: 'Send a broadcast message' })
  async sendBroadcast(
    @CurrentUser() user: AuthUser,
    @Body() body: BroadcastDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.sendBroadcast(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  @Post('notify')
  @ApiOperation({
    summary:
      'Send a single real push notification to one user (e.g. from a Doctor/Patient detail page)',
  })
  async notifyUser(@CurrentUser() user: AuthUser, @Body() body: NotifyUserDto) {
    this.checkAdmin(user);
    const data = await this.adminService.notifyUser(
      body.userId,
      body.title,
      body.message,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Public Leads (newsletter + consultation requests from the marketing site) ──
  @Get('leads/newsletter')
  @ApiOperation({ summary: 'All newsletter subscribers' })
  async getNewsletterSubscribers(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getNewsletterSubscribers();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Get('leads/consultation-requests')
  @ApiOperation({
    summary:
      'All consultation requests from the public symptom-checker / booking flow',
  })
  async getConsultationRequests(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getConsultationRequests();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @Put('leads/consultation-requests/:id/status')
  @ApiOperation({
    summary: 'Update a consultation request status as the care team follows up',
  })
  async updateConsultationRequestStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateLeadStatusDto,
  ) {
    this.checkAdmin(user);
    const data = await this.adminService.updateConsultationRequestStatus(
      id,
      body.status,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_UPDATED);
  }

  // ─── Analytics ────────────────────────────────────────────────────
  @Get('analytics')
  @ApiOperation({ summary: 'Analytics aggregates for charts' })
  async getAnalytics(@CurrentUser() user: AuthUser) {
    this.checkAdmin(user);
    const data = await this.adminService.getAnalytics();
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
