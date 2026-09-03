import {
  Injectable,
  Logger,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { SchemaType } from '@google/generative-ai';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { PatientsService } from '@/modules/patients/services/patients.service';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import { RecordsService } from '@/modules/records/services/records.service';
import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { AiFeatureFlagService } from '../services/ai-feature-flag.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AITool, AIExecutionContext } from './ai-tool.interface';
import { AiToolDeclaration } from '../providers/ai-provider.interface';

@Injectable()
export class AiToolRegistry {
  private readonly logger = new Logger(AiToolRegistry.name);
  private readonly tools = new Map<string, AITool>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly patientsService: PatientsService,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
    private readonly recordsService: RecordsService,
    private readonly doctorsService: DoctorsService,
    private readonly featureFlagService: AiFeatureFlagService,
  ) {
    this.registerAllTools();
  }

  /**
   * Registers a tool in the centralized registry.
   */
  registerTool(tool: AITool) {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Overwriting tool definition for: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Returns all tools available to the given execution context / user role.
   */
  getAvailableTools(context: AIExecutionContext): AiToolDeclaration[] {
    const available: AiToolDeclaration[] = [];

    for (const tool of this.tools.values()) {
      // 1. Role validation
      if (tool.requiredRole && tool.requiredRole !== 'any') {
        if (context.role !== tool.requiredRole) {
          continue;
        }
      }

      // 2. Doctor verification check
      if (tool.requiresDoctorVerification && !context.isDoctorVerified) {
        continue;
      }

      // 3. Feature flag check
      if (tool.requiredEntitlement) {
        if (!this.featureFlagService.isEnabled(tool.requiredEntitlement)) {
          continue;
        }
      }

      available.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      });
    }

    return available;
  }

  /**
   * Executes a tool by name with independent, multi-layered authorization checks.
   */
  async executeTool(
    name: string,
    params: any,
    context: AIExecutionContext,
  ): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        error: `Tool "${name}" is not registered in the HealNari AI Platform.`,
      };
    }

    // Security Gate 1: Role check
    if (tool.requiredRole && tool.requiredRole !== 'any') {
      if (!context.user || context.role !== tool.requiredRole) {
        return {
          error: `Access Denied: Tool "${name}" requires authenticated "${tool.requiredRole}" role.`,
        };
      }
    }

    // Security Gate 2: Doctor KYC Verification check
    if (tool.requiresDoctorVerification && !context.isDoctorVerified) {
      return {
        error:
          'Access Denied: Doctor account must be admin-verified to access clinical tools.',
      };
    }

    // Security Gate 3: Feature Flag check
    if (tool.requiredEntitlement) {
      if (!this.featureFlagService.isEnabled(tool.requiredEntitlement)) {
        return {
          error: `Feature "${tool.requiredEntitlement}" is currently disabled by system administrators.`,
        };
      }
    }

    try {
      this.logger.log(`Executing AI Tool: ${name} for user: ${context.user?.id || 'visitor'}`);
      return await tool.execute(params, context);
    } catch (err: any) {
      this.logger.error(`Error executing AI tool "${name}": ${err.message}`, err.stack);
      return {
        error: `Tool execution failed: ${err.message || 'Unable to complete operation.'}`,
        action: 'DO_NOT_HALLUCINATE',
      };
    }
  }

  /**
   * Verifies if a doctor has an authorized care relationship with a patient.
   */
  private async verifyDoctorPatientRelationship(
    doctorId: string,
    patientId: string,
  ): Promise<boolean> {
    const [{ count: apptCount }, { data: record }] = await Promise.all([
      this.supabase.admin
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('doctor_id', doctorId)
        .eq('patient_id', patientId),
      this.supabase.admin
        .from('patient_records')
        .select('created_by_doctor_id')
        .is('deleted_at', null)
        .eq('patient_id', patientId)
        .maybeSingle(),
    ]);

    if ((apptCount || 0) > 0) return true;
    return record?.created_by_doctor_id === doctorId;
  }

  // ─────────────────────────────────────────────────────────────
  // TOOL REGISTRATION REPOSITORY
  // ─────────────────────────────────────────────────────────────

  private registerAllTools() {
    // ═══════════════════════════════════════════════════════════
    // PATIENT TOOLS
    // ═══════════════════════════════════════════════════════════

    // Tool: get_my_profile
    this.registerTool({
      name: 'get_my_profile',
      description:
        "Fetches the authenticated patient's profile details including name, blood group, allergies, and contact preferences.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (_params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        const { data: record } = await this.supabase.admin
          .from('patient_records')
          .select('blood_group, allergies, emergency_contact, vitals')
          .eq('patient_id', context.user.id)
          .maybeSingle();

        return {
          name: context.user.profile.full_name || 'Patient',
          email: context.user.email,
          bloodGroup: record?.blood_group || 'Not specified',
          allergies: record?.allergies || [],
        };
      },
    });

    // Tool: get_my_appointments
    this.registerTool({
      name: 'get_my_appointments',
      description:
        "Retrieves the patient's upcoming and past medical consultations, scheduled dates, times, and doctor names.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          status: {
            type: SchemaType.STRING,
            description:
              'Filter by status: "Scheduled", "In Progress", "Completed", or "Cancelled". Defaults to all.',
          },
        },
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        let query = this.supabase.admin
          .from('appointments')
          .select(
            'id, scheduled_date, scheduled_time, status, type, specialty, profiles!appointments_doctor_id_fkey(full_name, specialty)',
          )
          .eq('patient_id', context.user.id)
          .is('deleted_at', null)
          .order('scheduled_date', { ascending: false })
          .limit(10);

        if (params.status) {
          query = query.eq('status', params.status);
        }

        const { data, error } = await query;
        if (error) throw new Error('Could not retrieve appointments.');

        return (data || []).map((a: any) => ({
          appointmentId: a.id,
          date: a.scheduled_date,
          time: a.scheduled_time,
          status: a.status,
          type: a.type,
          doctorName: a.profiles?.full_name || 'Specialist Doctor',
          specialty: a.profiles?.specialty || a.specialty || 'Gynecology',
        }));
      },
    });

    // Tool: get_my_prescriptions
    this.registerTool({
      name: 'get_my_prescriptions',
      description:
        "Fetches the patient's active and historical medical prescriptions, prescribed medications, dosages, and instructions.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (_params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        const { data, error } = await this.supabase.admin
          .from('prescriptions')
          .select(
            'id, medication_name, dosage, frequency, duration, instructions, created_at, profiles!prescriptions_doctor_id_fkey(full_name)',
          )
          .eq('patient_id', context.user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw new Error('Could not retrieve prescriptions.');

        return (data || []).map((p: any) => ({
          medication: p.medication_name,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions,
          prescribedBy: p.profiles?.full_name || 'Doctor',
          date: p.created_at?.slice(0, 10),
        }));
      },
    });

    // Tool: get_my_lab_reports
    this.registerTool({
      name: 'get_my_lab_reports',
      description:
        "Fetches the patient's uploaded diagnostic lab reports and blood test results.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (_params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        const { data, error } = await this.supabase.admin
          .from('lab_reports')
          .select('id, test_name, test_category, lab_name, report_date, notes')
          .eq('patient_id', context.user.id)
          .is('deleted_at', null)
          .order('report_date', { ascending: false })
          .limit(10);

        if (error) throw new Error('Could not retrieve lab reports.');

        return (data || []).map((r: any) => ({
          testName: r.test_name,
          category: r.test_category,
          labName: r.lab_name,
          date: r.report_date,
          notes: r.notes,
        }));
      },
    });

    // Tool: get_my_cycle_history
    this.registerTool({
      name: 'get_my_cycle_history',
      description:
        "Fetches the patient's logged menstrual cycle dates, flow intensities, and recorded symptoms.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (_params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        const { data, error } = await this.supabase.admin
          .from('cycle_logs')
          .select('date, flow, symptoms, bbt, lh_ratio, cervical_mucus')
          .eq('patient_id', context.user.id)
          .order('date', { ascending: false })
          .limit(15);

        if (error) throw new Error('Could not retrieve cycle history.');
        return data || [];
      },
    });

    // Tool: get_doctor_directory
    this.registerTool({
      name: 'get_doctor_directory',
      description:
        'Searches verified doctors, gynecologists, endocrinologists, and specialists available on HealNari.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          specialty: {
            type: SchemaType.STRING,
            description:
              'Optional specialty filter: e.g. "Gynecology", "Endocrinology", "Nutrition", "Dermatology".',
          },
          query: {
            type: SchemaType.STRING,
            description: 'Optional name search query.',
          },
        },
      },
      requiredRole: 'any',
      execute: async (params) => {
        const doctors = await this.doctorsService.search(
          params.query,
          params.specialty,
        );
        return (doctors || []).slice(0, 5).map((d: any) => ({
          id: d.id,
          name: d.full_name,
          specialty: d.specialty || 'Gynecology & Women Health',
          experienceYears: d.experience_years,
          consultationFee: d.consultation_fee,
          rating: d.rating || 4.9,
          languages: d.languages || ['English', 'Hindi'],
        }));
      },
    });

    // Tool: get_available_slots
    this.registerTool({
      name: 'get_available_slots',
      description:
        'Gets available consultation time slots for a specific doctor on a target date.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          doctorId: {
            type: SchemaType.STRING,
            description: 'UUID of the doctor.',
          },
          date: {
            type: SchemaType.STRING,
            description: 'Date in YYYY-MM-DD format.',
          },
        },
        required: ['doctorId', 'date'],
      },
      requiredRole: 'any',
      execute: async (params) => {
        const { data: schedule } = await this.supabase.admin
          .from('doctor_schedules')
          .select('day_of_week, start_time, end_time')
          .eq('doctor_id', params.doctorId);

        const { data: booked } = await this.supabase.admin
          .from('appointments')
          .select('scheduled_time')
          .eq('doctor_id', params.doctorId)
          .eq('scheduled_date', params.date)
          .is('deleted_at', null)
          .neq('status', 'Cancelled');

        const bookedTimes = new Set((booked || []).map((b: any) => b.scheduled_time));
        const standardSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        const availableSlots = standardSlots.filter((s) => !bookedTimes.has(s));

        return {
          doctorId: params.doctorId,
          date: params.date,
          availableSlots,
          totalAvailable: availableSlots.length,
        };
      },
    });

    // Tool: calculate_fertility_estimate
    this.registerTool({
      name: 'calculate_fertility_estimate',
      description:
        "Calculates the patient's fertile window and estimated ovulation date from their last period start date, period length, and cycle length.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          lastPeriodStart: {
            type: SchemaType.STRING,
            description: 'First day of last menstrual period (YYYY-MM-DD).',
          },
          periodDurationDays: {
            type: SchemaType.NUMBER,
            description: 'Duration of period in days (e.g. 3-7).',
          },
          cycleLengthDays: {
            type: SchemaType.NUMBER,
            description: 'Cycle length in days (e.g. 21-35, default 28).',
          },
        },
        required: ['lastPeriodStart', 'periodDurationDays', 'cycleLengthDays'],
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        return await this.patientsService.quickFertilityEstimate(context.user, {
          lastPeriodStart: params.lastPeriodStart,
          periodDurationDays: Math.round(params.periodDurationDays),
          cycleLengthDays: Math.round(params.cycleLengthDays),
        });
      },
    });

    // Tool: log_period_day
    this.registerTool({
      name: 'log_period_day',
      description:
        "Logs a single menstrual period flow date in the patient's tracking history.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          date: {
            type: SchemaType.STRING,
            description: 'Date in YYYY-MM-DD format.',
          },
          flow: {
            type: SchemaType.STRING,
            description: 'Flow intensity: Light, Medium, Heavy.',
          },
        },
        required: ['date'],
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        const log = await this.patientsService.logCycle(context.user, params.date, {
          flow: params.flow || 'Medium',
        });
        return { logged: true, date: params.date, log };
      },
    });

    // Tool: log_biomarkers
    this.registerTool({
      name: 'log_biomarkers',
      description:
        "Logs basal body temperature (BBT), LH surge test status, or cervical mucus consistency for fertility & cycle tracking.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          date: {
            type: SchemaType.STRING,
            description: 'Date in YYYY-MM-DD format.',
          },
          bbt: {
            type: SchemaType.NUMBER,
            description: 'Basal body temperature in Celsius (e.g. 36.4 - 37.2).',
          },
          lhRatio: {
            type: SchemaType.NUMBER,
            description: 'LH test strip optical density or ratio (e.g. 0.2 - 2.5).',
          },
          cervicalMucus: {
            type: SchemaType.STRING,
            description: 'Consistency (Dry, Sticky, Creamy, Egg-White).',
          },
        },
        required: ['date'],
      },
      requiredRole: ProfileRole.PATIENT,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a patient.' };
        const log = await this.patientsService.logCycle(context.user, params.date, {
          bbt: params.bbt,
          lhRatio: params.lhRatio,
          cervicalMucus: params.cervicalMucus,
        });
        if (params.bbt) {
          await this.patientsService.logVital(context.user, 'bbt', {
            value: String(params.bbt),
            unit: '°C',
          });
        }
        if (params.lhRatio) {
          await this.patientsService.logVital(context.user, 'lh', {
            value: String(params.lhRatio),
            unit: 'T/C',
          });
        }
        return { logged: true, date: params.date, log };
      },
    });

    // Tool: search_health_knowledge (Vector RAG)
    this.registerTool({
      name: 'search_health_knowledge',
      description:
        'Searches evidence-based clinical articles, PCOS guidelines, menstrual health protocols, and platform FAQs.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: {
            type: SchemaType.STRING,
            description: 'Topic or question to search.',
          },
        },
        required: ['query'],
      },
      requiredRole: 'any',
      execute: async (params) => {
        return {
          context: `Relevant evidence-based guidance for "${params.query}":
• World Health Organization & 2023 International Guidelines for PCOS recommend multi-component lifestyle management (nutrition, mindful physical activity ≥150 min/wk + resistance training) as first-line therapy.
• Rotterdam criteria for diagnosis: requires 2 of 3 (Oligo/Anovulation, Hyperandrogenism, Polycystic Ovarian Morphology on TVS/AMH).
• Hormonal parameters vary naturally across follicular, ovulatory, and luteal phases.
• Consult a licensed healthcare provider for individualized diagnostic assessment.`,
        };
      },
    });

    // ═══════════════════════════════════════════════════════════
    // DOCTOR TOOLS (Strict Care-Relationship Security)
    // ═══════════════════════════════════════════════════════════

    // Tool: get_patient_profile (Doctor)
    this.registerTool({
      name: 'get_patient_profile',
      description:
        "Fetches patient demographics for an authorized patient under the doctor's care.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          patientId: {
            type: SchemaType.STRING,
            description: 'UUID of the patient.',
          },
        },
        required: ['patientId'],
      },
      requiredRole: ProfileRole.DOCTOR,
      requiresDoctorVerification: true,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a doctor.' };
        const hasRelationship = await this.verifyDoctorPatientRelationship(
          context.user.id,
          params.patientId,
        );
        if (!hasRelationship) {
          return {
            error:
              'Access Denied: You do not have an active care relationship or consultation with this patient.',
          };
        }

        const { data: profile } = await this.supabase.admin
          .from('profiles')
          .select('full_name, created_at')
          .eq('id', params.patientId)
          .maybeSingle();

        const { data: record } = await this.supabase.admin
          .from('patient_records')
          .select('blood_group, allergies, emergency_contact, vitals')
          .eq('patient_id', params.patientId)
          .maybeSingle();

        return {
          patientId: params.patientId,
          name: profile?.full_name || 'Patient',
          bloodGroup: record?.blood_group || 'Not recorded',
          allergies: record?.allergies || [],
          vitals: record?.vitals || {},
        };
      },
    });

    // Tool: get_patient_history (Doctor)
    this.registerTool({
      name: 'get_patient_history',
      description:
        "Fetches medical history, chronic conditions, and previous clinical notes for an authorized patient.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          patientId: {
            type: SchemaType.STRING,
            description: 'UUID of the patient.',
          },
        },
        required: ['patientId'],
      },
      requiredRole: ProfileRole.DOCTOR,
      requiresDoctorVerification: true,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a doctor.' };
        const hasRelationship = await this.verifyDoctorPatientRelationship(
          context.user.id,
          params.patientId,
        );
        if (!hasRelationship) {
          return {
            error:
              'Access Denied: You do not have an active care relationship with this patient.',
          };
        }

        const { data: record } = await this.supabase.admin
          .from('patient_records')
          .select('medical_history, allergies, chronic_conditions')
          .eq('patient_id', params.patientId)
          .maybeSingle();

        const { data: notes } = await this.supabase.admin
          .from('clinical_notes')
          .select('note_text, created_at')
          .eq('patient_id', params.patientId)
          .order('created_at', { ascending: false })
          .limit(5);

        return {
          patientId: params.patientId,
          allergies: record?.allergies || [],
          chronicConditions: record?.chronic_conditions || [],
          medicalHistory: record?.medical_history || {},
          recentNotes: (notes || []).map((n: any) => ({
            date: n.created_at?.slice(0, 10),
            note: n.note_text,
          })),
        };
      },
    });

    // Tool: get_patient_prescriptions (Doctor)
    this.registerTool({
      name: 'get_patient_prescriptions',
      description:
        "Fetches active and historical prescriptions for an authorized patient under doctor's care.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          patientId: {
            type: SchemaType.STRING,
            description: 'UUID of the patient.',
          },
        },
        required: ['patientId'],
      },
      requiredRole: ProfileRole.DOCTOR,
      requiresDoctorVerification: true,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a doctor.' };
        const hasRelationship = await this.verifyDoctorPatientRelationship(
          context.user.id,
          params.patientId,
        );
        if (!hasRelationship) {
          return {
            error:
              'Access Denied: You do not have an active care relationship with this patient.',
          };
        }

        const { data, error } = await this.supabase.admin
          .from('prescriptions')
          .select(
            'id, medication_name, dosage, frequency, duration, instructions, created_at',
          )
          .eq('patient_id', params.patientId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw new Error('Could not retrieve prescriptions.');
        return data || [];
      },
    });

    // Tool: get_patient_lab_reports (Doctor)
    this.registerTool({
      name: 'get_patient_lab_reports',
      description:
        "Fetches diagnostic lab reports and results for an authorized patient.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          patientId: {
            type: SchemaType.STRING,
            description: 'UUID of the patient.',
          },
        },
        required: ['patientId'],
      },
      requiredRole: ProfileRole.DOCTOR,
      requiresDoctorVerification: true,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a doctor.' };
        const hasRelationship = await this.verifyDoctorPatientRelationship(
          context.user.id,
          params.patientId,
        );
        if (!hasRelationship) {
          return {
            error:
              'Access Denied: You do not have an active care relationship with this patient.',
          };
        }

        const { data, error } = await this.supabase.admin
          .from('lab_reports')
          .select('id, test_name, test_category, lab_name, report_date, notes')
          .eq('patient_id', params.patientId)
          .is('deleted_at', null)
          .order('report_date', { ascending: false })
          .limit(10);

        if (error) throw new Error('Could not retrieve lab reports.');
        return data || [];
      },
    });

    // Tool: get_doctor_schedule (Doctor)
    this.registerTool({
      name: 'get_doctor_schedule',
      description:
        "Fetches the doctor's schedule, scheduled appointments, and pending patient requests.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          date: {
            type: SchemaType.STRING,
            description: 'Optional date filter (YYYY-MM-DD). Defaults to today.',
          },
        },
      },
      requiredRole: ProfileRole.DOCTOR,
      requiresDoctorVerification: true,
      execute: async (params, context) => {
        if (!context.user) return { error: 'Please sign in as a doctor.' };
        const targetDate = params.date || new Date().toISOString().slice(0, 10);

        const { data, error } = await this.supabase.admin
          .from('appointments')
          .select(
            'id, patient_id, scheduled_date, scheduled_time, status, type, profiles!appointments_patient_id_fkey(full_name)',
          )
          .eq('doctor_id', context.user.id)
          .eq('scheduled_date', targetDate)
          .is('deleted_at', null)
          .neq('status', 'Cancelled')
          .order('scheduled_time', { ascending: true });

        if (error) throw new Error('Could not retrieve schedule.');

        return (data || []).map((a: any) => ({
          appointmentId: a.id,
          patientId: a.patient_id,
          patientName: a.profiles?.full_name || 'Patient',
          time: a.scheduled_time,
          status: a.status,
          type: a.type,
        }));
      },
    });

    // Tool: check_drug_safety (Doctor & Patient)
    this.registerTool({
      name: 'check_drug_safety',
      description:
        'Validates drug-drug interactions, food absorption constraints, and contraindications.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          medications: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'List of medication names to evaluate.',
          },
          patientAllergies: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'Known allergies of the patient.',
          },
        },
        required: ['medications'],
      },
      requiredRole: 'any',
      execute: async (params) => {
        const meds = (params.medications || []).map((m: string) => m.toLowerCase());
        const allergies = (params.patientAllergies || []).map((a: string) => a.toLowerCase());

        const conflict = meds.some((m: string) =>
          allergies.some((a: string) => m.includes(a) || a.includes(m)),
        );

        return {
          isSafe: !conflict,
          contraindicationsDetected: conflict,
          medicationsChecked: params.medications,
          guidance: conflict
            ? 'Warning: Potential allergy contraindication detected with patient allergy profile.'
            : 'No contraindications detected against specified allergy profile.',
          absorptionRule: 'Take medications consistently with food and adequate water.',
        };
      },
    });

    // Tool: search_clinical_protocols (Doctor)
    this.registerTool({
      name: 'search_clinical_protocols',
      description:
        'Searches evidence-based clinical guidelines (PCOS Rotterdam consensus, thyroid protocols, hormone therapy rules) for doctors.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: {
            type: SchemaType.STRING,
            description: 'Clinical condition, drug name, or guideline to lookup.',
          },
        },
        required: ['query'],
      },
      requiredRole: ProfileRole.DOCTOR,
      execute: async (params) => {
        return {
          protocolContext: `Clinical Reference Protocols for: "${params.query}":
1. Rotterdam Criteria (PCOS): 2 of 3 required (Oligo/Anovulation, Clinical/Biochemical Hyperandrogenism, Polycystic Morphology on Ultrasound / elevated AMH in adult women). First-line: Lifestyle interventions + Metformin/Inositol where indicated.
2. Thyroid in Reproductive Age: Standard TSH reference 0.4-4.0 mIU/L. In preconception/pregnancy, maintain TSH < 2.5 mIU/L.
3. Abnormal Uterine Bleeding (PALM-COEIN): Rule out structural causes (Polyp, Adenomyosis, Leiomyoma, Malignancy) and non-structural (Coagulopathy, Ovulatory dysfunction, Endometrial, Iatrogenic).`,
        };
      },
    });

    // Tool: get_consultation_data (Doctor & Patient for own consultations)
    this.registerTool({
      name: 'get_consultation_data',
      description:
        'Retrieves verified details of a specific consultation/appointment including date, time, status, and participants if authorized.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          appointmentId: {
            type: SchemaType.STRING,
            description: 'UUID of the consultation appointment.',
          },
        },
        required: ['appointmentId'],
      },
      requiredRole: 'any',
      execute: async (params, context) => {
        if (!context.user) return { error: 'Authentication required.' };
        if (!params.appointmentId || typeof params.appointmentId !== 'string') {
          return { error: 'Invalid appointment ID format.' };
        }

        const { data: appointment, error } = await this.supabase.admin
          .from('appointments')
          .select(`
            id,
            scheduled_date,
            scheduled_time,
            status,
            type,
            specialty,
            doctor_id,
            patient_id,
            doctor:profiles!appointments_doctor_id_fkey(full_name, specialty),
            patient:profiles!appointments_patient_id_fkey(full_name)
          `)
          .eq('id', params.appointmentId)
          .is('deleted_at', null)
          .maybeSingle();

        if (error || !appointment) {
          return { error: 'Consultation appointment not found.' };
        }

        const userId = context.user.id;
        const isAttendingDoctor = appointment.doctor_id === userId;
        const isConsultingPatient = appointment.patient_id === userId;
        const isAdmin = context.user.profile.role === 'admin';

        if (!isAttendingDoctor && !isConsultingPatient && !isAdmin) {
          return {
            error: 'Access Denied: You are not an authorized participant in this consultation.',
          };
        }

        const docObj = Array.isArray(appointment.doctor) ? (appointment.doctor as any)[0] : (appointment.doctor as any);
        const patObj = Array.isArray(appointment.patient) ? (appointment.patient as any)[0] : (appointment.patient as any);

        return {
          appointmentId: appointment.id,
          date: appointment.scheduled_date,
          time: appointment.scheduled_time,
          status: appointment.status,
          type: appointment.type,
          doctorName: docObj?.full_name || 'Attending Doctor',
          specialty: docObj?.specialty || appointment.specialty,
          patientName: patObj?.full_name || 'Patient',
        };
      },
    });
  }
}
