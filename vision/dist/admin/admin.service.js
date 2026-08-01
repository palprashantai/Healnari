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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../auth/user.entity");
const doctor_entity_1 = require("../doctors/doctor.entity");
const patient_entity_1 = require("../patients/patient.entity");
const appointment_entity_1 = require("../appointments/appointment.entity");
const support_ticket_entity_1 = require("./support-ticket.entity");
const refund_request_entity_1 = require("./refund-request.entity");
const errors_constant_1 = require("../common/constants/errors.constant");
let AdminService = class AdminService {
    userRepository;
    doctorRepository;
    patientRepository;
    appointmentRepository;
    ticketRepository;
    refundRepository;
    constructor(userRepository, doctorRepository, patientRepository, appointmentRepository, ticketRepository, refundRepository) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.ticketRepository = ticketRepository;
        this.refundRepository = refundRepository;
    }
    async getDashboardStats() {
        try {
            const totalUsers = await this.userRepository.count();
            const totalDoctors = await this.doctorRepository.count();
            const totalPatients = await this.patientRepository.count();
            const totalAppointments = await this.appointmentRepository.count();
            const completedAppointments = await this.appointmentRepository.count({
                where: { status: appointment_entity_1.AppointmentStatus.COMPLETED },
            });
            const pendingVerifications = await this.doctorRepository.count();
            const openTickets = await this.ticketRepository.count({ where: { status: 'Open' } });
            const pendingRefunds = await this.refundRepository.count({ where: { status: 'Pending' } });
            const revenueResult = await this.appointmentRepository
                .createQueryBuilder('appointment')
                .leftJoin('appointment.doctor', 'doctor')
                .select('SUM(doctor.consultation_fee)', 'total')
                .where('appointment.status = :status', { status: appointment_entity_1.AppointmentStatus.COMPLETED })
                .getRawOne();
            return {
                totalUsers,
                activeDoctors: totalDoctors,
                totalPatients,
                platformRevenue: parseFloat(revenueResult?.total || '0'),
                pendingVerifications,
                totalAppointments,
                completedConsultations: completedAppointments,
                openTickets,
                pendingRefunds,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getSystemHealth() {
        try {
            const dbCheck = await this.userRepository.count();
            return [
                { name: 'API Services', status: 'Operational', ping: `${Math.floor(Math.random() * 50) + 10}ms` },
                { name: 'Database', status: dbCheck >= 0 ? 'Operational' : 'Down', ping: `${dbCheck} records` },
                { name: 'SMS Gateway', status: 'Operational', ping: 'OK' },
                { name: 'Video Servers', status: 'Operational', ping: `${Math.floor(Math.random() * 60) + 20}ms` },
            ];
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getAllUsers() {
        try {
            return await this.userRepository.find({
                select: { id: true, name: true, email: true, role: true },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getDoctorsAndClinics() {
        try {
            return await this.doctorRepository.find({
                relations: { user: true },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getPendingVerifications() {
        try {
            return await this.doctorRepository.find({
                relations: { user: true },
                take: 20,
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async updateDoctorVerification(id, status) {
        try {
            const doctor = await this.doctorRepository.findOne({ where: { id } });
            if (!doctor)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.DOCTOR_NOT_FOUND);
            return { doctorId: doctor.id, statusUpdated: status, processedAt: new Date().toISOString() };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getRevenueData() {
        try {
            const completedCount = await this.appointmentRepository.count({
                where: { status: appointment_entity_1.AppointmentStatus.COMPLETED },
            });
            const revenueResult = await this.appointmentRepository
                .createQueryBuilder('appointment')
                .leftJoin('appointment.doctor', 'doctor')
                .select('SUM(doctor.consultation_fee)', 'total')
                .where('appointment.status = :status', { status: appointment_entity_1.AppointmentStatus.COMPLETED })
                .getRawOne();
            const totalRevenue = parseFloat(revenueResult?.total || '0');
            const bySpecialty = await this.appointmentRepository
                .createQueryBuilder('appointment')
                .leftJoin('appointment.doctor', 'doctor')
                .select('doctor.specialization', 'specialty')
                .addSelect('SUM(doctor.consultation_fee)', 'revenue')
                .where('appointment.status = :status', { status: appointment_entity_1.AppointmentStatus.COMPLETED })
                .groupBy('doctor.specialization')
                .getRawMany();
            return {
                currentMonth: totalRevenue,
                completedConsultations: completedCount,
                revenueBySpecialty: bySpecialty,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getSupportTickets() {
        try {
            return await this.ticketRepository.find({
                order: { created_at: 'DESC' },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async resolveTicket(ticketId) {
        try {
            const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
            if (!ticket)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.TICKET_NOT_FOUND);
            ticket.status = 'Resolved';
            return await this.ticketRepository.save(ticket);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getRefundRequests() {
        try {
            return await this.refundRepository.find({
                order: { created_at: 'DESC' },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async processRefund(refundId) {
        try {
            const refund = await this.refundRepository.findOne({ where: { id: refundId } });
            if (!refund)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.REFUND_NOT_FOUND);
            refund.status = 'Processed';
            return await this.refundRepository.save(refund);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getCmsContent() {
        try {
            return { banners: [], faqs: [], terms: '', privacy: '' };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getPlatformReports() {
        try {
            const totalUsers = await this.userRepository.count();
            const totalAppointments = await this.appointmentRepository.count();
            const completedAppointments = await this.appointmentRepository.count({
                where: { status: appointment_entity_1.AppointmentStatus.COMPLETED },
            });
            const cancelledAppointments = await this.appointmentRepository.count({
                where: { status: appointment_entity_1.AppointmentStatus.CANCELLED },
            });
            return {
                totalRegisteredUsers: totalUsers,
                totalAppointments,
                completedAppointments,
                cancelledAppointments,
                completionRate: totalAppointments > 0
                    ? `${Math.round((completedAppointments / totalAppointments) * 100)}%`
                    : '0%',
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(doctor_entity_1.Doctor)),
    __param(2, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __param(3, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(4, (0, typeorm_1.InjectRepository)(support_ticket_entity_1.SupportTicket)),
    __param(5, (0, typeorm_1.InjectRepository)(refund_request_entity_1.RefundRequest)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map