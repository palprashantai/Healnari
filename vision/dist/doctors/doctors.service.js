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
exports.DoctorsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const doctor_entity_1 = require("./doctor.entity");
const appointment_entity_1 = require("../appointments/appointment.entity");
const prescription_entity_1 = require("../records/prescription.entity");
const lab_result_entity_1 = require("../records/lab-result.entity");
const refill_request_entity_1 = require("./refill-request.entity");
const errors_constant_1 = require("../common/constants/errors.constant");
let DoctorsService = class DoctorsService {
    doctorRepository;
    appointmentRepository;
    prescriptionRepository;
    labResultRepository;
    refillRequestRepository;
    constructor(doctorRepository, appointmentRepository, prescriptionRepository, labResultRepository, refillRequestRepository) {
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labResultRepository = labResultRepository;
        this.refillRequestRepository = refillRequestRepository;
    }
    async getProfile(userId) {
        try {
            const doctor = await this.doctorRepository.findOne({
                where: { user_id: userId },
                relations: { user: true },
            });
            if (!doctor)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.DOCTOR_NOT_FOUND);
            return doctor;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getDashboardStats(userId) {
        try {
            const doctor = await this.getProfile(userId);
            const totalAppointments = await this.appointmentRepository.count({ where: { doctor_id: doctor.id } });
            const completedAppointments = await this.appointmentRepository.count({
                where: { doctor_id: doctor.id, status: appointment_entity_1.AppointmentStatus.COMPLETED },
            });
            const uniquePatients = await this.appointmentRepository
                .createQueryBuilder('appointment')
                .select('COUNT(DISTINCT appointment.patient_id)', 'count')
                .where('appointment.doctor_id = :doctorId', { doctorId: doctor.id })
                .getRawOne();
            const pendingLabReviews = await this.labResultRepository.count({
                where: { is_reviewed: false },
            });
            const pendingRefills = await this.refillRequestRepository.count({
                where: { doctor_id: doctor.id, status: 'pending' },
            });
            return {
                todayQueue: await this.appointmentRepository.count({
                    where: { doctor_id: doctor.id, status: appointment_entity_1.AppointmentStatus.SCHEDULED },
                }),
                totalPatients: parseInt(uniquePatients?.count || '0', 10),
                weekRevenue: completedAppointments * Number(doctor.consultation_fee),
                avgRating: doctor.rating,
                totalConsults: totalAppointments,
                completedConsults: completedAppointments,
                pendingLabReviews,
                pendingRefills,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getTodayQueue(userId) {
        try {
            const doctor = await this.getProfile(userId);
            const appointments = await this.appointmentRepository.find({
                where: { doctor_id: doctor.id, status: appointment_entity_1.AppointmentStatus.SCHEDULED },
                relations: { patient: { user: true } },
                order: { appointment_date: 'ASC' },
                take: 10,
            });
            return appointments.map((apt, i) => ({
                id: apt.id,
                token: `T-${String(i + 1).padStart(2, '0')}`,
                name: apt.patient?.user?.name || 'Patient',
                patientId: apt.patient_id,
                type: apt.notes || 'General Consultation',
                time: apt.appointment_date,
                status: apt.status,
            }));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async updateQueueStatus(userId, appointmentId, status) {
        try {
            const doctor = await this.getProfile(userId);
            const appointment = await this.appointmentRepository.findOne({
                where: { id: appointmentId, doctor_id: doctor.id },
            });
            if (!appointment)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.APPOINTMENT_NOT_FOUND);
            if (status === 'Done' || status === 'completed') {
                appointment.status = appointment_entity_1.AppointmentStatus.COMPLETED;
            }
            else if (status === 'No Show') {
                appointment.status = appointment_entity_1.AppointmentStatus.NO_SHOW;
            }
            else if (status === 'cancelled') {
                appointment.status = appointment_entity_1.AppointmentStatus.CANCELLED;
            }
            return await this.appointmentRepository.save(appointment);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getPendingLabs(userId) {
        try {
            await this.getProfile(userId);
            return await this.labResultRepository.find({
                where: { is_reviewed: false },
                relations: { patient: { user: true } },
                order: { created_at: 'DESC' },
                take: 10,
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getRefillRequests(userId) {
        try {
            const doctor = await this.getProfile(userId);
            return await this.refillRequestRepository.find({
                where: { doctor_id: doctor.id, status: 'pending' },
                relations: { patient: { user: true } },
                order: { created_at: 'DESC' },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async handleRefill(userId, refillId, action) {
        try {
            const doctor = await this.getProfile(userId);
            const refill = await this.refillRequestRepository.findOne({
                where: { id: refillId, doctor_id: doctor.id },
            });
            if (!refill)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.REFILL_NOT_FOUND);
            refill.status = action;
            return await this.refillRequestRepository.save(refill);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getPatients(userId) {
        try {
            const doctor = await this.getProfile(userId);
            const appointments = await this.appointmentRepository.find({
                where: { doctor_id: doctor.id },
                relations: { patient: { user: true } },
            });
            const patientMap = new Map();
            for (const appt of appointments) {
                if (appt.patient && !patientMap.has(appt.patient_id)) {
                    patientMap.set(appt.patient_id, {
                        id: appt.patient.id,
                        name: appt.patient.user?.name || 'Patient',
                        phone: appt.patient.phone,
                        city: appt.patient.city,
                        lastVisit: appt.appointment_date,
                    });
                }
            }
            return Array.from(patientMap.values());
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getAppointments(userId) {
        try {
            const doctor = await this.getProfile(userId);
            return await this.appointmentRepository.find({
                where: { doctor_id: doctor.id },
                relations: { patient: { user: true } },
                order: { appointment_date: 'DESC' },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getPrescriptions(userId) {
        try {
            const doctor = await this.getProfile(userId);
            return await this.prescriptionRepository.find({
                where: { doctor_id: doctor.id },
                relations: { patient: { user: true } },
                order: { id: 'DESC' },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async writePrescription(userId, data) {
        try {
            const doctor = await this.getProfile(userId);
            const prescription = this.prescriptionRepository.create({
                doctor_id: doctor.id,
                patient_id: data.patientId,
                appointment_id: data.appointmentId || undefined,
                medications: data.medications,
                instructions: data.instructions || undefined,
            });
            return await this.prescriptionRepository.save(prescription);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async updateProfile(userId, data) {
        try {
            const doctor = await this.getProfile(userId);
            if (data.specialization)
                doctor.specialization = data.specialization;
            if (data.consultation_fee)
                doctor.consultation_fee = data.consultation_fee;
            return await this.doctorRepository.save(doctor);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async submitKyc(userId, data) {
        try {
            const doctor = await this.getProfile(userId);
            return {
                doctorId: doctor.id,
                qualifications: data.qualifications,
                licenseNumber: data.licenseNumber,
                submittedAt: new Date().toISOString(),
                status: 'pending_review',
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async searchDoctors(query, specialty) {
        try {
            const qb = this.doctorRepository.createQueryBuilder('doctor')
                .leftJoinAndSelect('doctor.user', 'user');
            if (specialty)
                qb.andWhere('doctor.specialization = :specialty', { specialty });
            if (query)
                qb.andWhere('user.name LIKE :query', { query: `%${query}%` });
            return await qb.orderBy('doctor.rating', 'DESC').getMany();
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getAvailableSlots(doctorId, date) {
        try {
            const doctor = await this.doctorRepository.findOne({ where: { id: doctorId } });
            if (!doctor)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.DOCTOR_NOT_FOUND);
            const allSlots = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM', '5:30 PM'];
            return { doctorId, date, availableSlots: allSlots, fee: doctor.consultation_fee };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getStaff(userId) {
        try {
            await this.getProfile(userId);
            return [];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getReports(userId) {
        try {
            const doctor = await this.getProfile(userId);
            const totalConsults = await this.appointmentRepository.count({ where: { doctor_id: doctor.id } });
            const completed = await this.appointmentRepository.count({
                where: { doctor_id: doctor.id, status: appointment_entity_1.AppointmentStatus.COMPLETED },
            });
            const cancelled = await this.appointmentRepository.count({
                where: { doctor_id: doctor.id, status: appointment_entity_1.AppointmentStatus.CANCELLED },
            });
            return {
                totalConsultations: totalConsults,
                completed,
                cancelled,
                noShow: totalConsults - completed - cancelled,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getBillingData(userId) {
        try {
            const doctor = await this.getProfile(userId);
            const completedCount = await this.appointmentRepository.count({
                where: { doctor_id: doctor.id, status: appointment_entity_1.AppointmentStatus.COMPLETED },
            });
            const totalEarnings = completedCount * Number(doctor.consultation_fee);
            return {
                totalEarnings,
                pendingPayout: totalEarnings * 0.15,
                platformCommission: '15%',
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DoctorsService = DoctorsService;
exports.DoctorsService = DoctorsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(doctor_entity_1.Doctor)),
    __param(1, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(2, (0, typeorm_1.InjectRepository)(prescription_entity_1.Prescription)),
    __param(3, (0, typeorm_1.InjectRepository)(lab_result_entity_1.LabResult)),
    __param(4, (0, typeorm_1.InjectRepository)(refill_request_entity_1.RefillRequest)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DoctorsService);
//# sourceMappingURL=doctors.service.js.map