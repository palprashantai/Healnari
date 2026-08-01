import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { Patient } from './patient.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';
import { LabResult } from '../records/lab-result.entity';
import { HealthGoal } from './health-goal.entity';
import { CycleLog } from './cycle-log.entity';
import { SymptomLog } from './symptom-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Patient, Appointment, Prescription,
    LabResult, HealthGoal, CycleLog, SymptomLog,
  ])],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
