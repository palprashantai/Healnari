import { Controller, Get, Put, Post, Param, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiParam } from '@nestjs/swagger';
import { AdminService } from '@/modules/admin/services/admin.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';

export class UpdateVerificationDto {
  @ApiProperty({ enum: ['approved', 'rejected'] }) status: string;
}

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // SupabaseAuthGuard (global) has already verified the caller's real JWT by
  // the time a request reaches here — this only needs to check their role.
  private checkAdmin(user: AuthUser) {
    if (user.profile.role !== ProfileRole.ADMIN) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  @ApiOperation({ summary: 'Platform stats (4 stat cards)' })
  @ApiResponse({ status: 200 })
  @Get('dashboard')
  async getStats(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getDashboardStats();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'System health status (API, DB, SMS, Video)' })
  @ApiResponse({ status: 200 })
  @Get('system-health')
  async getSystemHealth(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getSystemHealth();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Support tickets list' })
  @ApiResponse({ status: 200 })
  @Get('tickets')
  async getTickets(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getSupportTickets();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Resolve a support ticket' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @Put('tickets/:id/resolve')
  async resolveTicket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.resolveTicket(Number(id));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.TICKET_RESOLVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Refund requests list' })
  @ApiResponse({ status: 200 })
  @Get('refunds')
  async getRefunds(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getRefundRequests();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Initiate refund to source' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id', description: 'Refund ID' })
  @Put('refunds/:id/process')
  async processRefund(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.processRefund(Number(id));
      return ResponseHelper.success(data, SUCCESS_MESSAGES.REFUND_INITIATED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'All platform users list' })
  @ApiResponse({ status: 200 })
  @Get('users')
  async getUsers(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getAllUsers();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Registered clinics and doctors' })
  @ApiResponse({ status: 200 })
  @Get('clinics')
  async getClinics(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getDoctorsAndClinics();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Pending doctor KYC verifications' })
  @ApiResponse({ status: 200 })
  @Get('verifications')
  async getPendingVerifications(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getPendingVerifications();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Approve or reject a doctor verification' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'id', description: 'Doctor ID' })
  @Put('verifications/:id')
  async updateVerification(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateVerificationDto) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.updateDoctorVerification(id, body.status);
      const msg = body.status === 'approved' ? SUCCESS_MESSAGES.VERIFICATION_APPROVED : SUCCESS_MESSAGES.VERIFICATION_REJECTED;
      return ResponseHelper.success(data, msg);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Platform revenue insights' })
  @ApiResponse({ status: 200 })
  @Get('revenue')
  async getRevenue(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getRevenueData();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'Platform-wide analytics reports' })
  @ApiResponse({ status: 200 })
  @Get('reports')
  async getReports(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getPlatformReports();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }

  @ApiOperation({ summary: 'CMS content (banners, FAQs, terms, privacy)' })
  @ApiResponse({ status: 200 })
  @Get('cms')
  async getCmsContent(@CurrentUser() user: AuthUser) {
    try {
      this.checkAdmin(user);
      const data = await this.adminService.getCmsContent();
      return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
    } catch (error) { throw error; }
  }
}
