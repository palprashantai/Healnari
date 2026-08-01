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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const appointment_entity_1 = require("./appointment.entity");
const errors_constant_1 = require("../common/constants/errors.constant");
let AppointmentsService = class AppointmentsService {
    appointmentRepository;
    constructor(appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }
    async book(data) {
        try {
            const appointmentDate = new Date(data.appointmentDate);
            if (appointmentDate < new Date()) {
                throw new common_1.BadRequestException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_PAST_DATE);
            }
            const conflict = await this.appointmentRepository.findOne({
                where: {
                    doctor_id: data.doctorId,
                    appointment_date: appointmentDate,
                    status: appointment_entity_1.AppointmentStatus.SCHEDULED,
                },
            });
            if (conflict) {
                throw new common_1.BadRequestException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_CONFLICT);
            }
            const appointment = this.appointmentRepository.create({
                patient_id: data.patientId,
                doctor_id: data.doctorId,
                appointment_date: appointmentDate,
                status: appointment_entity_1.AppointmentStatus.SCHEDULED,
                notes: data.notes || undefined,
            });
            return await this.appointmentRepository.save(appointment);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async cancel(appointmentId) {
        try {
            const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
            if (!appointment)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
            if (appointment.status === appointment_entity_1.AppointmentStatus.CANCELLED) {
                throw new common_1.BadRequestException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_ALREADY_CANCELLED);
            }
            appointment.status = appointment_entity_1.AppointmentStatus.CANCELLED;
            return await this.appointmentRepository.save(appointment);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async reschedule(appointmentId, newDate) {
        try {
            const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
            if (!appointment)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
            appointment.appointment_date = new Date(newDate);
            return await this.appointmentRepository.save(appointment);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async updateStatus(appointmentId, status) {
        try {
            const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
            if (!appointment)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
            appointment.status = status;
            return await this.appointmentRepository.save(appointment);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getById(appointmentId) {
        try {
            const appointment = await this.appointmentRepository.findOne({
                where: { id: appointmentId },
                relations: { patient: { user: true }, doctor: { user: true } },
            });
            if (!appointment)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
            return appointment;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map