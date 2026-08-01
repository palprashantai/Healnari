"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const ai_module_1 = require("./ai/ai.module");
const user_entity_1 = require("./auth/user.entity");
const patient_entity_1 = require("./patients/patient.entity");
const doctor_entity_1 = require("./doctors/doctor.entity");
const appointment_entity_1 = require("./appointments/appointment.entity");
const prescription_entity_1 = require("./records/prescription.entity");
const lab_result_entity_1 = require("./records/lab-result.entity");
const health_goal_entity_1 = require("./patients/health-goal.entity");
const cycle_log_entity_1 = require("./patients/cycle-log.entity");
const symptom_log_entity_1 = require("./patients/symptom-log.entity");
const refill_request_entity_1 = require("./doctors/refill-request.entity");
const support_ticket_entity_1 = require("./admin/support-ticket.entity");
const refund_request_entity_1 = require("./admin/refund-request.entity");
const auth_module_1 = require("./auth/auth.module");
const patients_module_1 = require("./patients/patients.module");
const doctors_module_1 = require("./doctors/doctors.module");
const appointments_module_1 = require("./appointments/appointments.module");
const records_module_1 = require("./records/records.module");
const admin_module_1 = require("./admin/admin.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '3306', 10),
                username: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || 'your_mysql_password',
                database: process.env.DB_NAME || 'business_db',
                entities: [
                    user_entity_1.User, patient_entity_1.Patient, doctor_entity_1.Doctor, appointment_entity_1.Appointment, prescription_entity_1.Prescription,
                    lab_result_entity_1.LabResult, health_goal_entity_1.HealthGoal, cycle_log_entity_1.CycleLog, symptom_log_entity_1.SymptomLog,
                    refill_request_entity_1.RefillRequest, support_ticket_entity_1.SupportTicket, refund_request_entity_1.RefundRequest,
                ],
                synchronize: true,
            }),
            ai_module_1.AiModule,
            auth_module_1.AuthModule,
            patients_module_1.PatientsModule,
            doctors_module_1.DoctorsModule,
            appointments_module_1.AppointmentsModule,
            records_module_1.RecordsModule,
            admin_module_1.AdminModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map