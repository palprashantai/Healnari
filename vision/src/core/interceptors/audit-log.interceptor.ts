import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SupabaseService } from '@/core/supabase/supabase.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly supabase: SupabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    
    // We only care about tracking authenticated endpoints
    const user = request.user;
    if (!user) {
      return next.handle();
    }

    const { method, originalUrl, ip } = request;
    const actorId = user.id;
    const actorRole = user.profile?.role || 'Unknown';

    // To prevent noise, we only log endpoints that are highly likely to contain PHI
    // e.g., /api/patients, /api/records, /api/appointments
    const isPhiEndpoint = originalUrl.includes('/patients') || 
                          originalUrl.includes('/records') || 
                          originalUrl.includes('/appointments') ||
                          originalUrl.includes('/prescriptions') ||
                          originalUrl.includes('/reports');

    if (!isPhiEndpoint) {
      return next.handle();
    }

    let targetPatientId = null;
    if (actorRole === 'Patient') {
      targetPatientId = actorId;
    } else {
      const match = originalUrl.match(/\/patients\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
      if (match) targetPatientId = match[1];
    }

    return next.handle().pipe(
      tap({
        next: () => this.logAction(actorId, actorRole, targetPatientId, method, originalUrl, ip, 'SUCCESS'),
        error: (err) => this.logAction(actorId, actorRole, targetPatientId, method, originalUrl, ip, `ERROR: ${err.status || 500}`)
      })
    );
  }

  private async logAction(actorId: string, actorRole: string, targetPatientId: string | null, method: string, url: string, ip: string, status: string) {
    try {
      // Non-blocking fire-and-forget log to Supabase
      // Uses the service_role client to bypass RLS for inserts
      await this.supabase.admin.from('phi_audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        target_patient_id: targetPatientId,
        action: method,
        resource: url.split('?')[0], // strip query params for the resource path
        status: status,
        ip_address: ip,
        details: { url }
      });
    } catch (error) {
      // Fail silently for the user, but log to the backend console
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }
}
