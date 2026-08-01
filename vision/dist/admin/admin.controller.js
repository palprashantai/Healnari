"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = exports.UpdateVerificationDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const response_helper_1 = require("../common/helpers/response.helper");
const messages_constant_1 = require("../common/constants/messages.constant");
const errors_constant_1 = require("../common/constants/errors.constant");
class UpdateVerificationDto {
    status;
}
exports.UpdateVerificationDto = UpdateVerificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['approved', 'rejected'] }),
    __metadata("design:type", String)
], UpdateVerificationDto.prototype, "status", void 0);
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    checkAdmin(headers) {
        const auth = headers['authorization'];
        if (!auth)
            throw new common_1.UnauthorizedException(errors_constant_1.ERROR_MESSAGES.UNAUTHORIZED);
        if (!auth.includes('admin'))
            throw new common_1.ForbiddenException(errors_constant_1.ERROR_MESSAGES.FORBIDDEN);
    }
    async getStats(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getDashboardStats();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getSystemHealth(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getSystemHealth();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getTickets(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getSupportTickets();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async resolveTicket(headers, id) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.resolveTicket(Number(id));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.TICKET_RESOLVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getRefunds(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getRefundRequests();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async processRefund(headers, id) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.processRefund(Number(id));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.REFUND_INITIATED);
        }
        catch (error) {
            throw error;
        }
    }
    async getUsers(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getAllUsers();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getClinics(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getDoctorsAndClinics();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getPendingVerifications(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getPendingVerifications();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async updateVerification(headers, id, body) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.updateDoctorVerification(Number(id), body.status);
            const msg = body.status === 'approved' ? messages_constant_1.SUCCESS_MESSAGES.VERIFICATION_APPROVED : messages_constant_1.SUCCESS_MESSAGES.VERIFICATION_REJECTED;
            return response_helper_1.ResponseHelper.success(data, msg);
        }
        catch (error) {
            throw error;
        }
    }
    async getRevenue(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getRevenueData();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getReports(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getPlatformReports();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getCmsContent(headers) {
        try {
            this.checkAdmin(headers);
            const data = await this.adminService.getCmsContent();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Platform stats (4 stat cards)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'System health status (API, DB, SMS, Video)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('system-health'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSystemHealth", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Support tickets list' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('tickets'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTickets", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Resolve a support ticket' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Ticket ID' }),
    (0, common_1.Put)('tickets/:id/resolve'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resolveTicket", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Refund requests list' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('refunds'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRefunds", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Initiate refund to source' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Refund ID' }),
    (0, common_1.Put)('refunds/:id/process'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "processRefund", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'All platform users list' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Registered clinics and doctors' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('clinics'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getClinics", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Pending doctor KYC verifications' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('verifications'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPendingVerifications", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject a doctor verification' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Doctor ID' }),
    (0, common_1.Put)('verifications/:id'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdateVerificationDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateVerification", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Platform revenue insights' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('revenue'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRevenue", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Platform-wide analytics reports' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getReports", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'CMS content (banners, FAQs, terms, privacy)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('cms'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCmsContent", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('api/admin'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', description: 'Bearer admin_token', required: true }),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map