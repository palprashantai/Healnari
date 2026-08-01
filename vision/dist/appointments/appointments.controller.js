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
exports.AppointmentsController = exports.UpdateStatusDto = exports.RescheduleDto = exports.BookAppointmentDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const appointments_service_1 = require("./appointments.service");
const response_helper_1 = require("../common/helpers/response.helper");
const messages_constant_1 = require("../common/constants/messages.constant");
class BookAppointmentDto {
    patientId;
    doctorId;
    appointmentDate;
    type;
    notes;
}
exports.BookAppointmentDto = BookAppointmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], BookAppointmentDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    __metadata("design:type", Number)
], BookAppointmentDto.prototype, "doctorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-20T10:00:00Z' }),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "appointmentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Video Consult' }),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Follow-up on PCOS treatment', required: false }),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "notes", void 0);
class RescheduleDto {
    newDate;
}
exports.RescheduleDto = RescheduleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-25T14:00:00Z' }),
    __metadata("design:type", String)
], RescheduleDto.prototype, "newDate", void 0);
class UpdateStatusDto {
    status;
}
exports.UpdateStatusDto = UpdateStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['completed', 'cancelled', 'no_show'] }),
    __metadata("design:type", String)
], UpdateStatusDto.prototype, "status", void 0);
let AppointmentsController = class AppointmentsController {
    appointmentsService;
    constructor(appointmentsService) {
        this.appointmentsService = appointmentsService;
    }
    async book(body) {
        try {
            const data = await this.appointmentsService.book(body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.APPOINTMENT_BOOKED);
        }
        catch (error) {
            throw error;
        }
    }
    async getById(id) {
        try {
            const data = await this.appointmentsService.getById(Number(id));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async cancel(id) {
        try {
            const data = await this.appointmentsService.cancel(Number(id));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.APPOINTMENT_CANCELLED);
        }
        catch (error) {
            throw error;
        }
    }
    async reschedule(id, body) {
        try {
            const data = await this.appointmentsService.reschedule(Number(id), body.newDate);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.APPOINTMENT_RESCHEDULED);
        }
        catch (error) {
            throw error;
        }
    }
    async updateStatus(id, body) {
        try {
            const data = await this.appointmentsService.updateStatus(Number(id), body.status);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.APPOINTMENT_UPDATED);
        }
        catch (error) {
            throw error;
        }
    }
};
exports.AppointmentsController = AppointmentsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Book a new consultation' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BookAppointmentDto]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "book", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get appointment details by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "getById", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Cancel an appointment' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, common_1.Put)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "cancel", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Reschedule an appointment' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, common_1.Put)(':id/reschedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RescheduleDto]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "reschedule", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update appointment status' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateStatusDto]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "updateStatus", null);
exports.AppointmentsController = AppointmentsController = __decorate([
    (0, swagger_1.ApiTags)('Appointments'),
    (0, common_1.Controller)('api/appointments'),
    __metadata("design:paramtypes", [appointments_service_1.AppointmentsService])
], AppointmentsController);
//# sourceMappingURL=appointments.controller.js.map