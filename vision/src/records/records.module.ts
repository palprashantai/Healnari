import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { Prescription } from './prescription.entity';
import { LabResult } from './lab-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Prescription, LabResult])],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
