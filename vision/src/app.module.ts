import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/core/auth/auth.module';
import { PatientsModule } from '@/modules/patients/patients.module';
import { DoctorsModule } from '@/modules/doctors/doctors.module';
import { AppointmentsModule } from '@/modules/appointments/appointments.module';
import { RecordsModule } from '@/modules/records/records.module';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';

import { AdminModule } from '@/modules/admin/admin.module';
import { AiModule } from '@/modules/ai/ai.module';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { TelemedicineModule } from '@/modules/telemedicine/telemedicine.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { CommunicationsModule } from '@/modules/communications/communications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    RecordsModule,
    AdminModule,
    AiModule,
    BillingModule,
    TelemedicineModule,
    StaffModule,
    CommunicationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
  ],
})
export class AppModule {}
