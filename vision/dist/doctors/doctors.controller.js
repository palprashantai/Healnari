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
exports.DoctorsController = exports.HandleRefillDto = exports.UpdateQueueStatusDto = exports.WritePrescriptionDto = exports.KycSubmissionDto = exports.UpdateProfileDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const doctors_service_1 = require("./doctors.service");
const response_helper_1 = require("../common/helpers/response.helper");
const messages_constant_1 = require("../common/constants/messages.constant");
const errors_constant_1 = require("../common/constants/errors.constant");
class UpdateProfileDto {
    specialization;
    consultation_fee;
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Gynecology', required: false }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "specialization", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 799, required: false }),
    __metadata("design:type", Number)
], UpdateProfileDto.prototype, "consultation_fee", void 0);
class KycSubmissionDto {
    qualifications;
    licenseNumber;
}
exports.KycSubmissionDto = KycSubmissionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'MD, FACOG' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "qualifications", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456789' }),
    __metadata("design:type", String)
], KycSubmissionDto.prototype, "licenseNumber", void 0);
class WritePrescriptionDto {
    patientId;
    appointmentId;
    medications;
    instructions;
}
exports.WritePrescriptionDto = WritePrescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], WritePrescriptionDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 101, required: false }),
    __metadata("design:type", Number)
], WritePrescriptionDto.prototype, "appointmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Metformin 500mg BD\nMyo-Inositol 2g OD' }),
    __metadata("design:type", String)
], WritePrescriptionDto.prototype, "medications", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Take after meals. Review in 4 weeks.', required: false }),
    __metadata("design:type", String)
], WritePrescriptionDto.prototype, "instructions", void 0);
class UpdateQueueStatusDto {
    status;
}
exports.UpdateQueueStatusDto = UpdateQueueStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['In Progress', 'Waiting', 'Done', 'No Show'] }),
    __metadata("design:type", String)
], UpdateQueueStatusDto.prototype, "status", void 0);
class HandleRefillDto {
    action;
}
exports.HandleRefillDto = HandleRefillDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['approved', 'denied'] }),
    __metadata("design:type", String)
], HandleRefillDto.prototype, "action", void 0);
let DoctorsController = class DoctorsController {
    doctorsService;
    constructor(doctorsService) {
        this.doctorsService = doctorsService;
    }
    extractUserId(headers) {
        const auth = headers['authorization'];
        if (!auth)
            throw new common_1.UnauthorizedException(errors_constant_1.ERROR_MESSAGES.UNAUTHORIZED);
        const userId = parseInt(auth.split(' ')[1], 10);
        if (isNaN(userId))
            throw new common_1.UnauthorizedException(errors_constant_1.ERROR_MESSAGES.UNAUTHORIZED);
        return userId;
    }
    async getDashboard(headers) {
        try {
            const data = await this.doctorsService.getDashboardStats(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getTodayQueue(headers) {
        try {
            const data = await this.doctorsService.getTodayQueue(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async updateQueueStatus(headers, appointmentId, body) {
        try {
            const data = await this.doctorsService.updateQueueStatus(this.extractUserId(headers), Number(appointmentId), body.status);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.QUEUE_TOKEN_UPDATED);
        }
        catch (error) {
            throw error;
        }
    }
    async getPendingLabs(headers) {
        try {
            const data = await this.doctorsService.getPendingLabs(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getRefillRequests(headers) {
        try {
            const data = await this.doctorsService.getRefillRequests(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async handleRefill(headers, refillId, body) {
        try {
            const data = await this.doctorsService.handleRefill(this.extractUserId(headers), Number(refillId), body.action);
            const msg = body.action === 'approved' ? messages_constant_1.SUCCESS_MESSAGES.PRESCRIPTION_REFILL_APPROVED : messages_constant_1.SUCCESS_MESSAGES.PRESCRIPTION_REFILL_DENIED;
            return response_helper_1.ResponseHelper.success(data, msg);
        }
        catch (error) {
            throw error;
        }
    }
    async getProfile(headers) {
        try {
            const data = await this.doctorsService.getProfile(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async updateProfile(headers, body) {
        try {
            const data = await this.doctorsService.updateProfile(this.extractUserId(headers), body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.PROFILE_UPDATED);
        }
        catch (error) {
            throw error;
        }
    }
    async submitKyc(headers, body) {
        try {
            const data = await this.doctorsService.submitKyc(this.extractUserId(headers), body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.KYC_SUBMITTED);
        }
        catch (error) {
            throw error;
        }
    }
    async getPatients(headers) {
        try {
            const data = await this.doctorsService.getPatients(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getAppointments(headers) {
        try {
            const data = await this.doctorsService.getAppointments(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getPrescriptions(headers) {
        try {
            const data = await this.doctorsService.getPrescriptions(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async writePrescription(headers, body) {
        try {
            const data = await this.doctorsService.writePrescription(this.extractUserId(headers), body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.PRESCRIPTION_ADDED);
        }
        catch (error) {
            throw error;
        }
    }
    async getReports(headers) {
        try {
            const data = await this.doctorsService.getReports(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getBillingData(headers) {
        try {
            const data = await this.doctorsService.getBillingData(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getStaff(headers) {
        try {
            const data = await this.doctorsService.getStaff(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async searchDoctors(q, specialty) {
        try {
            const data = await this.doctorsService.searchDoctors(q, specialty);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getAvailableSlots(doctorId, date) {
        try {
            const data = await this.doctorsService.getAvailableSlots(Number(doctorId), date);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
};
exports.DoctorsController = DoctorsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Dashboard stats (6 stat cards)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/dashboard'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getDashboard", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: "Today's patient queue with tokens" }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/queue'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getTodayQueue", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update queue token status (e.g. Waiting → In Progress → Done)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'appointmentId' }),
    (0, common_1.Put)('me/queue/:appointmentId'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('appointmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdateQueueStatusDto]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "updateQueueStatus", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Pending lab results awaiting review' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/pending-labs'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getPendingLabs", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Prescription refill requests' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/refill-requests'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getRefillRequests", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Approve or deny a refill request' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'refillId' }),
    (0, common_1.Put)('me/refill-requests/:refillId'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Param)('refillId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, HandleRefillDto]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "handleRefill", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get doctor profile' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getProfile", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update doctor profile (specialization, fee)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Put)('me/profile'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "updateProfile", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Submit KYC documents for verification' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    (0, common_1.Post)('me/kyc'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, KycSubmissionDto]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "submitKyc", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List all patients who have consulted with this doctor' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/patients'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getPatients", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Doctor appointment history' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/appointments'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getAppointments", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List prescriptions written by this doctor' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/prescriptions'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getPrescriptions", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Write a new digital prescription' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    (0, common_1.Post)('me/prescriptions'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, WritePrescriptionDto]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "writePrescription", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Analytics and consultation reports' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/reports'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getReports", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Doctor earnings and payout data' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/billing'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getBillingData", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Manage clinic staff' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/staff'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getStaff", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Search verified doctors (public)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: false, description: 'Name search query' }),
    (0, swagger_1.ApiQuery)({ name: 'specialty', required: false, description: 'Filter by specialty' }),
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('specialty')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "searchDoctors", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get available time slots for a doctor on a date' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'doctorId' }),
    (0, swagger_1.ApiQuery)({ name: 'date', required: true, description: 'YYYY-MM-DD' }),
    (0, common_1.Get)(':doctorId/slots'),
    __param(0, (0, common_1.Param)('doctorId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DoctorsController.prototype, "getAvailableSlots", null);
exports.DoctorsController = DoctorsController = __decorate([
    (0, swagger_1.ApiTags)('Doctors'),
    (0, common_1.Controller)('api/doctors'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', description: 'Bearer <user_id>', required: true }),
    __metadata("design:paramtypes", [doctors_service_1.DoctorsService])
], DoctorsController);
//# sourceMappingURL=doctors.controller.js.map