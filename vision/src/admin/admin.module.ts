import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../auth/user.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Patient } from '../patients/patient.entity';
import { Appointment } from '../appointments/appointment.entity';
import { SupportTicket } from './support-ticket.entity';
import { RefundRequest } from './refund-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    User, Doctor, Patient, Appointment, SupportTicket, RefundRequest,
  ])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
