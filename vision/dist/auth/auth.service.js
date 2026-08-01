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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const patient_entity_1 = require("../patients/patient.entity");
const doctor_entity_1 = require("../doctors/doctor.entity");
const errors_constant_1 = require("../common/constants/errors.constant");
let AuthService = class AuthService {
    userRepository;
    patientRepository;
    doctorRepository;
    constructor(userRepository, patientRepository, doctorRepository) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }
    async login(email) {
        try {
            const user = await this.userRepository.findOne({ where: { email } });
            if (!user)
                throw new common_1.BadRequestException(errors_constant_1.ERROR_MESSAGES.USER_NOT_FOUND);
            return {
                accessToken: `dummy-jwt-token-for-${user.id}`,
                user,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
    async register(data) {
        try {
            const existing = await this.userRepository.findOne({ where: { email: data.email } });
            if (existing)
                throw new common_1.BadRequestException(errors_constant_1.ERROR_MESSAGES.USER_ALREADY_EXISTS);
            const user = this.userRepository.create({
                name: data.name,
                email: data.email,
                password: 'hashed-password',
                role: data.role,
            });
            const savedUser = await this.userRepository.save(user);
            if (data.role === 'patient') {
                const patient = this.patientRepository.create({ user_id: savedUser.id });
                await this.patientRepository.save(patient);
            }
            else if (data.role === 'doctor') {
                const doctor = this.doctorRepository.create({ user_id: savedUser.id, specialization: 'General' });
                await this.doctorRepository.save(doctor);
            }
            return {
                accessToken: `dummy-jwt-token-for-${savedUser.id}`,
                user: savedUser,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.InternalServerErrorException(errors_constant_1.ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(patient_entity_1.Patient)),
    __param(2, (0, typeorm_1.InjectRepository)(doctor_entity_1.Doctor)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map