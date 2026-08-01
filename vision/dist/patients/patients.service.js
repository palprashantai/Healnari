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
exports.PatientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const patient_entity_1 = require("./patient.entity");
const appointment_entity_1 = require("../appointments/appointment.entity");
const prescription_entity_1 = require("../records/prescription.entity");
const lab_result_entity_1 = require("../records/lab-result.entity");
const health_goal_entity_1 = require("./health-goal.entity");
const cycle_log_entity_1 = require("./cycle-log.entity");
const symptom_log_entity_1 = require("./symptom-log.entity");
const errors_constant_1 = require("../common/constants/errors.constant");
let PatientsService = class PatientsService {
    patientRepository;
    appointmentRepository;
    prescriptionRepository;
    labResultRepository;
    healthGoalRepository;
    cycleLogRepository;
    symptomLogRepository;
    constructor(patientRepository, appointmentRepository, prescriptionRepository, labResultRepository, healthGoalRepository, cycleLogRepository, symptomLogRepository) {
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.labResultRepository = labResultRepository;
        this.healthGoalRepository = healthGoalRepository;
        this.cycleLogRepository = cycleLogRepository;
        this.symptomLogRepository = symptomLogRepository;
    }
    async getProfile(userId) {
        try {
            const patient = await this.patientRepository.findOne({
                where: { user_id: userId },
                relations: { user: true },
            });
            if (!patient)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.PATIENT_NOT_FOUND);
            return patient;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getDashboardStats(userId) {
        try {
            const patient = await this.getProfile(userId);
            const upcomingAppointments = await this.appointmentRepository.count({
                where: { patient_id: patient.id, status: appointment_entity_1.AppointmentStatus.SCHEDULED },
            });
            const activePrescriptions = await this.prescriptionRepository.count({
                where: { patient_id: patient.id },
            });
            const unreadReports = await this.labResultRepository.count({
                where: { patient_id: patient.id, is_reviewed: false },
            });
            const nextAppointment = await this.appointmentRepository.findOne({
                where: { patient_id: patient.id, status: appointment_entity_1.AppointmentStatus.SCHEDULED },
                order: { appointment_date: 'ASC' },
            });
            const nextAppointmentInDays = nextAppointment
                ? Math.ceil((new Date(nextAppointment.appointment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
            const completedCount = await this.appointmentRepository.count({
                where: { patient_id: patient.id, status: appointment_entity_1.AppointmentStatus.COMPLETED },
            });
            const healthScore = Math.min(100, 50 + completedCount * 5);
            return {
                nextAppointmentInDays,
                upcomingAppointments,
                activePrescriptions,
                healthScore,
                unreadReports,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getUpcomingVisits(userId) {
        try {
            const patient = await this.getProfile(userId);
            return await this.appointmentRepository.find({
                where: { patient_id: patient.id, status: appointment_entity_1.AppointmentStatus.SCHEDULED },
                relations: { doctor: { user: true } },
                order: { appointment_date: 'ASC' },
                take: 5,
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async onboard(userId, data) {
        try {
            const patient = await this.getProfile(userId);
            if (data.phone)
                patient.phone = data.phone;
            if (data.city)
                patient.city = data.city;
            if (data.date_of_birth)
                patient.date_of_birth = new Date(data.date_of_birth);
            return await this.patientRepository.save(patient);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async updateHealthMetrics(userId, metrics) {
        try {
            const patient = await this.getProfile(userId);
            return { patientId: patient.id, loggedAt: new Date().toISOString(), ...metrics };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getAppointments(userId) {
        try {
            const patient = await this.getProfile(userId);
            return await this.appointmentRepository.find({
                where: { patient_id: patient.id },
                relations: { doctor: { user: true } },
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
            const patient = await this.getProfile(userId);
            return await this.prescriptionRepository.find({
                where: { patient_id: patient.id },
                relations: { doctor: { user: true } },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getBilling(userId) {
        try {
            const patient = await this.getProfile(userId);
            const appointments = await this.appointmentRepository.find({
                where: { patient_id: patient.id, status: appointment_entity_1.AppointmentStatus.COMPLETED },
                relations: { doctor: { user: true } },
                order: { appointment_date: 'DESC' },
            });
            return appointments.map((apt) => ({
                invoiceId: `INV-${1000 + apt.id}`,
                date: apt.appointment_date,
                doctorName: apt.doctor?.user?.name || 'Doctor',
                amount: apt.doctor?.consultation_fee || 0,
                status: 'Paid',
                paymentMethod: 'Razorpay',
            }));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async submitSymptomReport(userId, data) {
        try {
            const patient = await this.getProfile(userId);
            const log = this.symptomLogRepository.create({
                patient_id: patient.id,
                symptoms: data.symptoms,
                severity: data.severity,
                review_status: 'pending_review',
            });
            return await this.symptomLogRepository.save(log);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getLabReports(userId) {
        try {
            const patient = await this.getProfile(userId);
            const results = await this.labResultRepository.find({
                where: { patient_id: patient.id },
                order: { created_at: 'DESC' },
            });
            const panels = new Map();
            for (const r of results) {
                if (!panels.has(r.panel_title)) {
                    panels.set(r.panel_title, {
                        title: r.panel_title,
                        orderedBy: r.ordered_by,
                        lab: r.lab_name,
                        date: r.created_at,
                        results: [],
                    });
                }
                panels.get(r.panel_title).results.push({
                    name: r.test_name,
                    value: r.value,
                    ref: r.reference_range,
                    status: r.status,
                });
            }
            return { patientId: patient.id, panels: Array.from(panels.values()) };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getHealthGoals(userId) {
        try {
            const patient = await this.getProfile(userId);
            return await this.healthGoalRepository.find({
                where: { patient_id: patient.id },
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async logGoalProgress(userId, goalId) {
        try {
            const patient = await this.getProfile(userId);
            const goal = await this.healthGoalRepository.findOne({
                where: { id: goalId, patient_id: patient.id },
            });
            if (!goal)
                throw new common_1.NotFoundException('Health goal not found.');
            goal.progress_pct = Math.min(100, goal.progress_pct + 5);
            return await this.healthGoalRepository.save(goal);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getCycleData(userId) {
        try {
            const patient = await this.getProfile(userId);
            const log = await this.cycleLogRepository.findOne({
                where: { patient_id: patient.id },
                order: { created_at: 'DESC' },
            });
            if (!log) {
                return { currentPhase: null, cycleDay: null, cycleLength: null, message: 'No cycle data logged yet.' };
            }
            return {
                currentPhase: log.current_phase,
                cycleDay: log.current_day,
                cycleLength: log.cycle_length,
                cycleStartDate: log.cycle_start_date,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getFamilyMembers(userId) {
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
};
exports.PatientsService = PatientsService;
exports.PatientsService = PatientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __param(1, (0, typeorm_1.InjectRepository)(appointment_entity_1.Appointment)),
    __param(2, (0, typeorm_1.InjectRepository)(prescription_entity_1.Prescription)),
    __param(3, (0, typeorm_1.InjectRepository)(lab_result_entity_1.LabResult)),
    __param(4, (0, typeorm_1.InjectRepository)(health_goal_entity_1.HealthGoal)),
    __param(5, (0, typeorm_1.InjectRepository)(cycle_log_entity_1.CycleLog)),
    __param(6, (0, typeorm_1.InjectRepository)(symptom_log_entity_1.SymptomLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PatientsService);
//# sourceMappingURL=patients.service.js.map