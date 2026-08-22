import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/core/auth/auth.module';
import { PatientsModule } from '@/modules/patients/patients.module';
import { DoctorsModule } from '@/modules/doctors/doctors.module';
import { AppointmentsModule } from '@/modules/appointments/appointments.module';
import { RecordsModule } from '@/modules/records/records.module';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from '@/core/interceptors/audit-log.interceptor';

import { AdminModule } from '@/modules/admin/admin.module';
import { AiModule } from '@/modules/ai/ai.module';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { FXModule } from '@/core/fx/fx.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { TelemedicineModule } from '@/modules/telemedicine/telemedicine.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { CommunicationsModule } from '@/modules/communications/communications.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PushSubscriptionsModule } from '@/modules/push-subscriptions/push-subscriptions.module';
import { LeadsModule } from '@/modules/leads/leads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    SupabaseModule,
    FXModule,
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
    NotificationsModule,
    PushSubscriptionsModule,
    LeadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
