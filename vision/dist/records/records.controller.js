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
exports.RecordsController = exports.CreatePrescriptionDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const records_service_1 = require("./records.service");
const response_helper_1 = require("../common/helpers/response.helper");
const messages_constant_1 = require("../common/constants/messages.constant");
class CreatePrescriptionDto {
    patientId;
    doctorId;
    appointmentId;
    medications;
    instructions;
}
exports.CreatePrescriptionDto = CreatePrescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], CreatePrescriptionDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    __metadata("design:type", Number)
], CreatePrescriptionDto.prototype, "doctorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 101, required: false }),
    __metadata("design:type", Number)
], CreatePrescriptionDto.prototype, "appointmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Metformin 500mg BD\nMyo-Inositol 2g OD' }),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "medications", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Take after meals. Review in 4 weeks.', required: false }),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "instructions", void 0);
let RecordsController = class RecordsController {
    recordsService;
    constructor(recordsService) {
        this.recordsService = recordsService;
    }
    async getPrescriptions() {
        try {
            const data = await this.recordsService.getAllPrescriptions();
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async getPrescriptionById(id) {
        try {
            const data = await this.recordsService.getPrescriptionById(Number(id));
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.DATA_RETRIEVED);
        }
        catch (error) {
            throw error;
        }
    }
    async createPrescription(body) {
        try {
            const data = await this.recordsService.createPrescription(body);
            return response_helper_1.ResponseHelper.success(data, messages_constant_1.SUCCESS_MESSAGES.PRESCRIPTION_ADDED);
        }
        catch (error) {
            throw error;
        }
    }
};
exports.RecordsController = RecordsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all prescriptions' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, common_1.Get)('prescriptions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "getPrescriptions", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get prescription by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, common_1.Get)('prescriptions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "getPrescriptionById", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new prescription' }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    (0, common_1.Post)('prescriptions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePrescriptionDto]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "createPrescription", null);
exports.RecordsController = RecordsController = __decorate([
    (0, swagger_1.ApiTags)('Medical Records'),
    (0, common_1.Controller)('api/records'),
    __metadata("design:paramtypes", [records_service_1.RecordsService])
], RecordsController);
//# sourceMappingURL=records.controller.js.map