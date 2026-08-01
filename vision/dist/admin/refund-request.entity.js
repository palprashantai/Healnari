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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundRequest = void 0;
const typeorm_1 = require("typeorm");
let RefundRequest = class RefundRequest {
    id;
    patient_name;
    amount;
    reason;
    status;
    gateway;
    created_at;
};
exports.RefundRequest = RefundRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], RefundRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "patient_name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Pending' }),
    __metadata("design:type", String)
], RefundRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Razorpay' }),
    __metadata("design:type", String)
], RefundRequest.prototype, "gateway", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RefundRequest.prototype, "created_at", void 0);
exports.RefundRequest = RefundRequest = __decorate([
    (0, typeorm_1.Entity)('refund_requests')
], RefundRequest);
//# sourceMappingURL=refund-request.entity.js.map