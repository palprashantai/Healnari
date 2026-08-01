import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { User } from './auth/user.entity';
import { Patient } from './patients/patient.entity';
import { Doctor } from './doctors/doctor.entity';
import { Appointment } from './appointments/appointment.entity';
import { Prescription } from './records/prescription.entity';
import { LabResult } from './records/lab-result.entity';
import { HealthGoal } from './patients/health-goal.entity';
import { CycleLog } from './patients/cycle-log.entity';
import { SymptomLog } from './patients/symptom-log.entity';
import { RefillRequest } from './doctors/refill-request.entity';
import { SupportTicket } from './admin/support-ticket.entity';
import { RefundRequest } from './admin/refund-request.entity';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { RecordsModule } from './records/records.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'your_mysql_password',
      database: process.env.DB_NAME || 'business_db',
      entities: [
        User, Patient, Doctor, Appointment, Prescription,
        LabResult, HealthGoal, CycleLog, SymptomLog,
        RefillRequest, SupportTicket, RefundRequest,
      ],
      synchronize: true,
    }),
    AiModule,
    AuthModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    RecordsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
