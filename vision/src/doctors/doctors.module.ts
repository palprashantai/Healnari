import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from './doctor.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';
import { LabResult } from '../records/lab-result.entity';
import { RefillRequest } from './refill-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Doctor, Appointment, Prescription, LabResult, RefillRequest,
  ])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
