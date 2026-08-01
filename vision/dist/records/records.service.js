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
exports.RecordsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const prescription_entity_1 = require("./prescription.entity");
const errors_constant_1 = require("../common/constants/errors.constant");
let RecordsService = class RecordsService {
    prescriptionRepository;
    constructor(prescriptionRepository) {
        this.prescriptionRepository = prescriptionRepository;
    }
    async getAllPrescriptions() {
        try {
            return await this.prescriptionRepository.find({
                relations: { patient: { user: true }, doctor: { user: true } },
                order: { id: 'DESC' },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async getPrescriptionById(id) {
        try {
            const rx = await this.prescriptionRepository.findOne({
                where: { id },
                relations: { patient: { user: true }, doctor: { user: true } },
            });
            if (!rx)
                throw new common_1.NotFoundException(errors_constant_1.ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND);
            return rx;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async createPrescription(data) {
        try {
            const prescription = this.prescriptionRepository.create({
                patient_id: data.patientId,
                doctor_id: data.doctorId,
                appointment_id: data.appointmentId || undefined,
                medications: data.medications,
                instructions: data.instructions || undefined,
            });
            return await this.prescriptionRepository.save(prescription);
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.RecordsService = RecordsService;
exports.RecordsService = RecordsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(prescription_entity_1.Prescription)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RecordsService);
//# sourceMappingURL=records.service.js.map