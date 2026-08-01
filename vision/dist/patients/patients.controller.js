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
exports.PatientsController = exports.LogGoalDto = exports.SymptomReportDto = exports.HealthMetricsDto = exports.OnboardDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const patients_service_1 = require("./patients.service");
const response_helper_1 = require("../common/helpers/response.helper");
const messages_constant_1 = require("../common/constants/messages.constant");
const errors_constant_1 = require("../common/constants/errors.constant");
class OnboardDto {
    age;
    height;
    weight;
    bloodGroup;
    conditions;
    phone;
    city;
    date_of_birth;
}
exports.OnboardDto = OnboardDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '28' }),
    __metadata("design:type", String)
], OnboardDto.prototype, "age", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '165' }),
    __metadata("design:type", String)
], OnboardDto.prototype, "height", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '62' }),
    __metadata("design:type", String)
], OnboardDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'B+' }),
    __metadata("design:type", String)
], OnboardDto.prototype, "bloodGroup", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['PCOS / PCOD', 'Thyroid Issues'], type: [String] }),
    __metadata("design:type", Array)
], OnboardDto.prototype, "conditions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123-456-7890', required: false }),
    __metadata("design:type", String)
], OnboardDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Mumbai', required: false }),
    __metadata("design:type", String)
], OnboardDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1998-03-15', required: false }),
    __metadata("design:type", String)
], OnboardDto.prototype, "date_of_birth", void 0);
class HealthMetricsDto {
    bloodPressure;
    weight;
    exerciseLevel;
    sleepHours;
}
exports.HealthMetricsDto = HealthMetricsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '120/80', required: false }),
    __metadata("design:type", String)
], HealthMetricsDto.prototype, "bloodPressure", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '65', required: false }),
    __metadata("design:type", String)
], HealthMetricsDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Moderate', required: false }),
    __metadata("design:type", String)
], HealthMetricsDto.prototype, "exerciseLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 7.5, required: false }),
    __metadata("design:type", Number)
], HealthMetricsDto.prototype, "sleepHours", void 0);
class SymptomReportDto {
    symptoms;
    severity;
}
exports.SymptomReportDto = SymptomReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['Cramps', 'Bloating', 'Fatigue'], type: [String] }),
    __metadata("design:type", Array)
], SymptomReportDto.prototype, "symptoms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 6, minimum: 1, maximum: 10 }),
    __metadata("design:type", Number)
], SymptomReportDto.prototype, "severity", void 0);
class LogGoalDto {
    goalId;
}
exports.LogGoalDto = LogGoalDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], LogGoalDto.prototype, "goalId", void 0);
let PatientsController = class PatientsController {
    patientsService;
    constructor(patientsService) {
        this.patientsService = patientsService;
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
            const data = await this.patientsService.getDashboardStats(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getProfile(headers) {
        try {
            const data = await this.patientsService.getProfile(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async onboard(headers, body) {
        try {
            const data = await this.patientsService.onboard(this.extractUserId(headers), body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.ONBOARDING_COMPLETE);
        }
        catch (error) {
            throw error;
        }
    }
    async updateHealthMetrics(headers, body) {
        try {
            const data = await this.patientsService.updateHealthMetrics(this.extractUserId(headers), body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.HEALTH_METRICS_UPDATED);
        }
        catch (error) {
            throw error;
        }
    }
    async getUpcomingVisits(headers) {
        try {
            const data = await this.patientsService.getUpcomingVisits(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getCycleData(headers) {
        try {
            const data = await this.patientsService.getCycleData(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async submitSymptomReport(headers, body) {
        try {
            const data = await this.patientsService.submitSymptomReport(this.extractUserId(headers), body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.SYMPTOM_REPORT_SUBMITTED);
        }
        catch (error) {
            throw error;
        }
    }
    async getHealthGoals(headers) {
        try {
            const data = await this.patientsService.getHealthGoals(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async logGoalProgress(headers, body) {
        try {
            const data = await this.patientsService.logGoalProgress(this.extractUserId(headers), body.goalId);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.GOAL_LOGGED);
        }
        catch (error) {
            throw error;
        }
    }
    async getAppointments(headers) {
        try {
            const data = await this.patientsService.getAppointments(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getPrescriptions(headers) {
        try {
            const data = await this.patientsService.getPrescriptions(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getLabReports(headers) {
        try {
            const data = await this.patientsService.getLabReports(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getBilling(headers) {
        try {
            const data = await this.patientsService.getBilling(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getFamilyMembers(headers) {
        try {
            const data = await this.patientsService.getFamilyMembers(this.extractUserId(headers));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
};
exports.PatientsController = PatientsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Dashboard stats (stat strip cards)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/dashboard'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getDashboard", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Patient profile (header welcome)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getProfile", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Complete onboarding (age, bloodGroup, conditions)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Put)('me/onboard'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, OnboardDto]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "onboard", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update daily health metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Put)('me/health-metrics'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, HealthMetricsDto]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "updateHealthMetrics", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Upcoming sidebar visits (dashboard sidebar)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/upcoming-visits'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getUpcomingVisits", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get menstrual cycle tracking data' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/cycle'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getCycleData", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Submit symptom report to care team' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    (0, common_1.Post)('me/symptoms'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SymptomReportDto]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "submitSymptomReport", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get health goals and progress' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/goals'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getHealthGoals", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Log daily goal progress' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Post)('me/goals/log'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, LogGoalDto]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "logGoalProgress", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Full appointment history (upcoming + past)' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/appointments'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getAppointments", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Digital prescriptions list' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/prescriptions'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getPrescriptions", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get lab reports and hormonal panels' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/lab-reports'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getLabReports", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Billing invoices & payment history' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/billing'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getBilling", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Linked family member accounts' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('me/family'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "getFamilyMembers", null);
exports.PatientsController = PatientsController = __decorate([
    (0, swagger_1.ApiTags)('Patients'),
    (0, common_1.Controller)('api/patients'),
    (0, swagger_1.ApiHeader)({ name: 'Authorization', description: 'Bearer <user_id>', required: true }),
    __metadata("design:paramtypes", [patients_service_1.PatientsService])
], PatientsController);
//# sourceMappingURL=patients.controller.js.map