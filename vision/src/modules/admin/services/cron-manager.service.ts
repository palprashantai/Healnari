import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { SupabaseService } from '@/core/supabase/supabase.service';

export interface CronMetadata {
  name: string;
  displayName: string;
  category: 'Patient' | 'Doctor' | 'Admin' | 'Billing' | 'Appointments';
  description: string;
  defaultSchedule: string;
}

export interface CronJobItem extends CronMetadata {
  running: boolean;
  expression: string;
  nextRun: string | null;
  lastRun: string | null;
}

export const CRON_CATALOG: Record<string, CronMetadata> = {
  appointments_reminder_30min: {
    name: 'appointments_reminder_30min',
    displayName: '30-Min Call Pre-Flight Reminder',
    category: 'Appointments',
    description: 'Sweeps upcoming appointments within 30 minutes and reminds patients to complete device checks.',
    defaultSchedule: '*/5 * * * *',
  },
  appointments_queue_delay: {
    name: 'appointments_queue_delay',
    displayName: 'Live Queue Delay Projection',
    category: 'Appointments',
    description: 'Projects waiting room start times and alerts patients if the doctor is running >15 minutes behind.',
    defaultSchedule: '*/5 * * * *',
  },
  appointments_unpaid_release: {
    name: 'appointments_unpaid_release',
    displayName: 'Unpaid Slot Timeout Release',
    category: 'Appointments',
    description: 'Auto-cancels booking slots where payment was abandoned after 5 minutes, unlocking them for others.',
    defaultSchedule: '*/5 * * * *',
  },
  prescription_refill_reminders: {
    name: 'prescription_refill_reminders',
    displayName: 'Prescription Refill Expiry Warning',
    category: 'Patient',
    description: 'Alerts patients with active prescriptions when 5 or fewer days of medication remain.',
    defaultSchedule: '0 9 * * *',
  },
  prescription_follow_up_reminders: {
    name: 'prescription_follow_up_reminders',
    displayName: 'Doctor Recommended Follow-Up Chaser',
    category: 'Patient',
    description: 'Reminds patients when their recommended 2-week review window arrives after teleconsultation.',
    defaultSchedule: '0 10 * * *',
  },
  prescription_pending_lab_reminders: {
    name: 'prescription_pending_lab_reminders',
    displayName: 'Pending Lab Report Chaser',
    category: 'Patient',
    description: 'Reminds patients with doctor-requested lab tests older than 3 days who have not uploaded results.',
    defaultSchedule: '0 11 * * *',
  },
  cycle_period_prediction: {
    name: 'cycle_period_prediction',
    displayName: 'Period Approaching 2-Day Alert',
    category: 'Patient',
    description: 'Calculates cycle lengths and notifies women 2 days before predicted menstruation.',
    defaultSchedule: '0 7 * * *',
  },
  cycle_fertile_window: {
    name: 'cycle_fertile_window',
    displayName: 'Fertile Window & Ovulation Notice',
    category: 'Patient',
    description: 'Alerts patients tracking fertility of their 5-day conception window and peak ovulation.',
    defaultSchedule: '0 30 7 * * *',
  },
  doctor_daily_agenda: {
    name: 'doctor_daily_agenda',
    displayName: 'Doctor Morning Agenda Digest',
    category: 'Doctor',
    description: 'Sends daily schedule summaries of video consults and clinic visits to doctors.',
    defaultSchedule: '0 45 7 * * *',
  },
  doctor_stale_consultation_archival: {
    name: 'doctor_stale_consultation_archival',
    displayName: 'Nightly Queue Archival',
    category: 'Doctor',
    description: 'Auto-closes abandoned consultations left in waiting or in-progress overnight.',
    defaultSchedule: '0 2 * * *',
  },
  admin_daily_revenue_reconciliation: {
    name: 'admin_daily_revenue_reconciliation',
    displayName: 'Daily Financial Settlement Reconciliation',
    category: 'Admin',
    description: 'Aggregates 24-hour gross revenue, 15% platform commission, and doctor net payouts.',
    defaultSchedule: '0 0 * * *',
  },
  admin_doctor_kyc_escalation: {
    name: 'admin_doctor_kyc_escalation',
    displayName: 'Doctor KYC Review Escalation',
    category: 'Admin',
    description: 'Alerts administrators if doctor verification submissions have been pending >48 hours.',
    defaultSchedule: '0 0 12 * * 1',
  },
  billing_automated_refunds: {
    name: 'billing_automated_refunds',
    displayName: 'Automated Cancellation Refunds',
    category: 'Billing',
    description: 'Sweeps cancelled consultations with active payments and triggers automatic Cashfree refunds.',
    defaultSchedule: '0 */15 * * * *',
  },
  billing_care_plan_renewals: {
    name: 'billing_care_plan_renewals',
    displayName: 'Care Plan Renewal Reminders',
    category: 'Billing',
    description: 'Alerts patients when 7 days remain on their 3-Month / 6-Month care packages.',
    defaultSchedule: '0 9 * * *',
  },
};

@Injectable()
export class CronManagerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronManagerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * On startup, restore persisted schedules and running states from Supabase database.
   */
  async onApplicationBootstrap() {
    await this.restorePersistedConfigurations();
  }

  /**
   * Restores persisted cron configurations (schedules and pause states) from Supabase.
   */
  async restorePersistedConfigurations() {
    try {
      const { data: configs, error } = await this.supabase.admin
        .from('cron_configurations')
        .select('*');

      if (error || !Array.isArray(configs) || configs.length === 0) return;

      const registeredJobs = this.schedulerRegistry.getCronJobs();

      for (const config of configs) {
        let job: any;
        try {
          job = registeredJobs.get(config.name);
        } catch {
          job = undefined;
        }

        if (job) {
          // Re-apply custom schedule if stored
          if (config.expression) {
            try {
              job.setTime(new CronTime(config.expression));
            } catch (err) {
              this.logger.warn(`Failed to restore schedule for ${config.name}: ${err.message}`);
            }
          }

          // Re-apply paused / running state
          if (config.is_running === false) {
            if (typeof job.stop === 'function') job.stop();
          } else if (config.is_running === true) {
            if (typeof job.start === 'function') job.start();
          }
        }
      }

      this.logger.log(`Successfully synced ${configs.length} cron configuration(s) from Supabase database.`);
    } catch (err) {
      this.logger.warn(`Could not restore cron configurations from database: ${err.message}`);
    }
  }

  /**
   * Dynamically discovers and lists all registered cron jobs from SchedulerRegistry.
   * Auto-infers category and display metadata for any newly registered jobs.
   */
  listAllCrons(): CronJobItem[] {
    const registeredJobs = this.schedulerRegistry.getCronJobs();
    const result: CronJobItem[] = [];
    const processedNames = new Set<string>();

    // 1. Dynamically scan every active job in the NestJS SchedulerRegistry Map
    registeredJobs.forEach((job: any, name: string) => {
      processedNames.add(name);
      const meta = CRON_CATALOG[name] || this.inferJobMetadata(name);

      let nextRun: string | null = null;
      let lastRun: string | null = null;
      try {
        const next = typeof job.nextDate === 'function' ? job.nextDate() : null;
        nextRun = next ? (typeof next.toISO === 'function' ? next.toISO() : new Date(next).toISOString()) : null;
      } catch {}
      try {
        const last = typeof job.lastDate === 'function' ? job.lastDate() : null;
        lastRun = last ? (last instanceof Date ? last.toISOString() : new Date(last).toISOString()) : null;
      } catch {}

      // Extract real runtime cron expression
      const cronTime = job.cronTime;
      const expression = cronTime?.source || meta.defaultSchedule;
      const isRunning = job.running !== undefined ? Boolean(job.running) : true;

      result.push({
        ...meta,
        name,
        running: isRunning,
        expression: String(expression || meta.defaultSchedule),
        nextRun,
        lastRun,
      });
    });

    // 2. Also include any pre-cataloged jobs that may not currently be active in registry
    for (const [name, meta] of Object.entries(CRON_CATALOG)) {
      if (!processedNames.has(name)) {
        result.push({
          ...meta,
          running: false,
          expression: meta.defaultSchedule,
          nextRun: null,
          lastRun: null,
        });
      }
    }

    return result;
  }

  /**
   * Auto-infers human title and category for any dynamically detected background job.
   */
  private inferJobMetadata(name: string): CronMetadata {
    const displayName = name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    let category: CronMetadata['category'] = 'Admin';
    const lower = name.toLowerCase();

    if (lower.includes('patient') || lower.includes('cycle') || lower.includes('prescription') || lower.includes('period') || lower.includes('fertile')) {
      category = 'Patient';
    } else if (lower.includes('doctor') || lower.includes('queue') || lower.includes('agenda') || lower.includes('consult')) {
      category = 'Doctor';
    } else if (lower.includes('billing') || lower.includes('refund') || lower.includes('revenue') || lower.includes('payout') || lower.includes('plan')) {
      category = 'Billing';
    } else if (lower.includes('appointment') || lower.includes('booking') || lower.includes('slot') || lower.includes('reminder')) {
      category = 'Appointments';
    }

    return {
      name,
      displayName,
      category,
      description: `Automated platform background service (${name}).`,
      defaultSchedule: '0 * * * *',
    };
  }

  /**
   * Start or stop a specific cron job dynamically and persist to Supabase.
   */
  async toggleCron(name: string, shouldRun?: boolean) {
    const job: any = this.getJobOrThrow(name);

    const isRunning = job.running !== undefined ? Boolean(job.running) : true;
    const newState = shouldRun !== undefined ? shouldRun : !isRunning;
    if (newState) {
      if (typeof job.start === 'function') job.start();
      this.logger.log(`Admin started cron job '${name}'`);
    } else {
      if (typeof job.stop === 'function') job.stop();
      this.logger.log(`Admin stopped cron job '${name}'`);
    }

    const currentRunning = job.running !== undefined ? Boolean(job.running) : newState;
    const meta = CRON_CATALOG[name] || this.inferJobMetadata(name);
    const cronTime = job.cronTime;
    const expression = cronTime?.source || meta.defaultSchedule;

    // Persist configuration in Supabase
    this.persistCronConfig(name, meta.displayName, meta.category, String(expression), currentRunning).catch(() => {});

    return {
      name,
      running: currentRunning,
      message: `Cron job '${name}' is now ${currentRunning ? 'Active (Running)' : 'Paused (Stopped)'}`,
    };
  }

  /**
   * Manually trigger/execute a cron job on-demand, timing it and recording an execution audit log.
   */
  async runCronNow(name: string) {
    const job: any = this.getJobOrThrow(name);
    this.logger.log(`Admin manually triggered cron job '${name}'`);
    const startTime = Date.now();

    try {
      if (typeof job.fireOnTick === 'function') {
        await job.fireOnTick();
      }
      const durationMs = Date.now() - startTime;

      // Save execution audit log in Supabase
      this.logExecution({
        job_name: name,
        status: 'SUCCESS',
        triggered_by: 'MANUAL_ADMIN',
        duration_ms: durationMs,
      }).catch(() => {});

      this.updateLastRunAt(name).catch(() => {});

      return {
        name,
        success: true,
        message: `Cron job '${name}' executed successfully on-demand (${durationMs}ms).`,
        durationMs,
        executedAt: new Date().toISOString(),
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`Error running cron '${name}' on-demand: ${err.message}`);

      // Record failed execution log
      this.logExecution({
        job_name: name,
        status: 'FAILED',
        triggered_by: 'MANUAL_ADMIN',
        duration_ms: durationMs,
        error_message: err.message,
      }).catch(() => {});

      throw new BadRequestException(`Failed to execute cron job '${name}': ${err.message}`);
    }
  }

  /**
   * Dynamically update the cron schedule expression and persist to Supabase.
   */
  async updateCronSchedule(name: string, expression: string) {
    const job: any = this.getJobOrThrow(name);

    try {
      const isCurrentlyRunning = job.running !== undefined ? Boolean(job.running) : true;
      const newTime = new CronTime(expression);
      if (typeof job.setTime === 'function') {
        job.setTime(newTime);
      }

      if (isCurrentlyRunning && typeof job.start === 'function') {
        job.start();
      }

      this.logger.log(`Admin updated schedule for cron '${name}' to '${expression}'`);

      const nextDate = typeof job.nextDate === 'function' ? job.nextDate() : null;
      const meta = CRON_CATALOG[name] || this.inferJobMetadata(name);
      const isRunning = job.running !== undefined ? Boolean(job.running) : true;

      // Persist new schedule in Supabase
      this.persistCronConfig(name, meta.displayName, meta.category, expression, isRunning).catch(() => {});

      return {
        name,
        expression,
        running: isRunning,
        nextRun: nextDate?.toISO ? nextDate.toISO() : null,
        message: `Schedule for '${name}' updated to '${expression}'`,
      };
    } catch (err) {
      throw new BadRequestException(`Invalid cron expression '${expression}': ${err.message}`);
    }
  }

  /**
   * Persists cron configuration to Supabase PostgreSQL table.
   */
  private async persistCronConfig(
    name: string,
    displayName: string,
    category: string,
    expression: string,
    isRunning: boolean,
  ) {
    try {
      await this.supabase.admin
        .from('cron_configurations')
        .upsert(
          {
            name,
            display_name: displayName,
            category,
            expression,
            is_running: isRunning,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'name' },
        );
    } catch (err) {
      this.logger.warn(`Could not save cron configuration for ${name} in Supabase: ${err.message}`);
    }
  }

  /**
   * Updates last_run_at timestamp in cron_configurations.
   */
  private async updateLastRunAt(name: string) {
    try {
      await this.supabase.admin
        .from('cron_configurations')
        .update({ last_run_at: new Date().toISOString() })
        .eq('name', name);
    } catch {}
  }

  /**
   * Records execution audit log in cron_execution_logs.
   */
  async logExecution(log: {
    job_name: string;
    status: 'SUCCESS' | 'FAILED';
    triggered_by: 'SCHEDULE' | 'MANUAL_ADMIN';
    duration_ms?: number;
    items_processed?: number;
    error_message?: string;
    details?: any;
  }) {
    try {
      await this.supabase.admin
        .from('cron_execution_logs')
        .insert({
          job_name: log.job_name,
          status: log.status,
          triggered_by: log.triggered_by,
          duration_ms: log.duration_ms || 0,
          items_processed: log.items_processed || 0,
          error_message: log.error_message || null,
          details: log.details || {},
          created_at: new Date().toISOString(),
        });
    } catch (err) {
      this.logger.warn(`Could not record execution log for ${log.job_name}: ${err.message}`);
    }
  }

  /**
   * Retrieves recent execution logs from Supabase.
   */
  async getExecutionLogs(jobName?: string, limit = 50) {
    try {
      let query = this.supabase.admin
        .from('cron_execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (jobName) {
        query = query.eq('job_name', jobName);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  private getJobOrThrow(name: string): any {
    try {
      const job = this.schedulerRegistry.getCronJob(name);
      if (!job) throw new Error();
      return job;
    } catch {
      throw new NotFoundException(`Cron job '${name}' was not found in active scheduler registry.`);
    }
  }
}
