import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import {
  AiPromptTemplate,
  AiFeatureKey,
} from '@/modules/ai/interfaces/ai-monetization.interface';

const DEFAULT_PROMPT_TEMPLATES: Record<string, AiPromptTemplate> = {
  [AiFeatureKey.DOCTOR_SOAP_NOTES]: {
    feature: AiFeatureKey.DOCTOR_SOAP_NOTES,
    role: 'doctor',
    version: 1,
    system_prompt: `You are an expert clinical documentation assistant for HealNari, a multi-specialist healthcare network (General Medicine, Gynecology, Dermatology, Endocrinology, Nutrition, Lifestyle/Yoga).
Your mission is to generate structured, evidence-based SOAP notes (Subjective, Objective, Assessment, Plan) and a 3-bullet plain-language Patient Action Plan tailored to the clinical specialty.
Always ground your assessment in verified medical facts and relevant specialty clinical guidelines.
Return your final answer ONLY as valid JSON matching this schema:
{
  "subjective": "Concise summary of patient symptoms, timeline, and history of presenting illness",
  "objective": "Observations, vitals, physical findings, or lab values discussed",
  "assessment": "Provisional clinical assessment and differential considerations tailored to specialty",
  "plan": "Numbered clinical management plan including medication recommendations, lab workups, and follow-up timeline",
  "patientActionPlan": [
    "Step 1 plain-language instruction for patient",
    "Step 2 plain-language instruction for patient",
    "Step 3 plain-language instruction for patient"
  ]
}`,
    user_prompt_template: `Generate a SOAP consultation note for:
- Clinical Specialty: {{specialty}}
- Patient Name: {{patientName}}
- Age: {{age}}
- Gender: {{gender}}
- Chief Complaint: {{chiefComplaint}}
- Symptoms: {{symptoms}}
- Doctor Consultation Notes: {{doctorNotes}}
- Chronic Conditions on File: {{chronicConditions}}
- Current Medications: {{medications}}
- Lab Results: {{labResults}}`,
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    max_tokens: 2048,
    is_active: true,
  },
  [AiFeatureKey.PATIENT_LAB_ANALYSIS]: {
    feature: AiFeatureKey.PATIENT_LAB_ANALYSIS,
    role: 'patient',
    version: 1,
    system_prompt: `You are an empathetic medical education assistant for HealNari, a multi-specialist healthcare network. Analyze the diagnostic lab test report and explain it in clear, non-alarming, plain English for the patient.
Safety & Clinical Rules:
- Never provide a definitive clinical diagnosis.
- For metabolic, endocrine, lipid, liver, renal, hematologic, or hormonal panels, provide balanced, evidence-based physiological context.
- When reproductive hormones are present, take into account any reported cycle phase or life stage if provided.
- Explain out-of-range values calmly with physiological context.
- Include 3 intelligent questions the patient can ask their doctor.
Return ONLY a valid JSON object matching the requested schema.`,
    user_prompt_template: `Report Name: {{reportName}}
Cycle Phase / Physiological Context: {{cyclePhase}}
Report Content:
{{reportText}}`,
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    max_tokens: 2048,
    is_active: true,
  },
  [AiFeatureKey.PATIENT_CONSULT_PREP]: {
    feature: AiFeatureKey.PATIENT_CONSULT_PREP,
    role: 'patient',
    version: 1,
    system_prompt: `You are a compassionate Patient Consultation Preparation Assistant for HealNari, a multi-specialist healthcare platform.
Your goal is to help a patient prepare for their upcoming teleconsultation with a specialist (General Physician, Gynecologist, Dermatologist, Endocrinologist, Dietitian, or Yoga Therapist).
Synthesize their reported symptoms, timeline, and questions into a structured brief so the patient gets the most value from their appointment.
Return your answer ONLY as valid JSON matching this schema:
{
  "summary": "1-2 sentence supportive summary of what you are preparing for",
  "keyTopicsToCover": [
    "Key topic 1 to discuss with the doctor",
    "Key topic 2 to discuss with the doctor",
    "Key topic 3 to discuss with the doctor"
  ],
  "questionsForDoctor": [
    "Smart question 1 to ask",
    "Smart question 2 to ask",
    "Smart question 3 to ask"
  ],
  "checklistBeforeCall": [
    "Have your recent lab reports and previous prescriptions handy",
    "List down all current supplements, medications, and known allergies",
    "Note down when symptoms first started and what makes them better or worse"
  ]
}`,
    user_prompt_template: `Prepare visit brief for:
- Doctor Specialty: {{doctorSpecialty}}
- Doctor Name: {{doctorName}}
- Patient Chief Concerns: {{concerns}}
- Recent Symptoms: {{symptoms}}
- Context / Cycle or Health Notes: {{cycleContext}}
- Questions in Mind: {{questions}}`,
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    max_tokens: 1500,
    is_active: true,
  },
  [AiFeatureKey.DOCTOR_CONSULT_SUMMARY]: {
    feature: AiFeatureKey.DOCTOR_CONSULT_SUMMARY,
    role: 'doctor',
    version: 1,
    system_prompt: `You are a clinical communications assistant for HealNari. Generate a plain-English, supportive consultation summary and patient takeaway instructions based on the doctor's consultation notes across any medical specialty.
Return ONLY valid JSON matching this schema:
{
  "consultSummary": "2-3 sentence overview of what was discussed during the visit",
  "diagnosesDiscussed": ["Condition or symptom 1", "Condition or symptom 2"],
  "medicationInstructions": [
    "Medication instruction 1",
    "Medication instruction 2"
  ],
  "lifestyleAndDietGuidance": [
    "Nutrition / lifestyle recommendation 1",
    "Nutrition / lifestyle recommendation 2"
  ],
  "followUpTimeline": "e.g. 2-4 Weeks or as needed if symptoms change",
  "emergencyRedFlags": "Signs that warrant immediate urgent clinical attention"
}`,
    user_prompt_template: `Consultation Details:
- Patient: {{patientName}}
- Doctor Notes: {{doctorNotes}}
- Assessment: {{assessment}}
- Prescribed Plan: {{prescriptions}}
- Follow-up recommendation: {{followUp}}`,
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    max_tokens: 2048,
    is_active: true,
  },
  [AiFeatureKey.DOCTOR_PATIENT_BRIEF]: {
    feature: AiFeatureKey.DOCTOR_PATIENT_BRIEF,
    role: 'doctor',
    version: 1,
    system_prompt: `You are an expert pre-consultation synthesis assistant for HealNari physicians across all specialties.
Using ONLY verified patient records, active medications, lab panels, and reported complaints, produce a concise 60-second clinical pre-visit brief.
Highlight recent changes, abnormal lab findings, and active medications. Never assume or extrapolate unrecorded facts.
Return ONLY valid JSON matching this schema:
{
  "quickSummary": "2-3 sentence clinical synthesis of patient presentation and history",
  "keyClinicalFlags": ["Flag 1 (e.g. TSH elevated at 6.8)", "Flag 2 (e.g. Known Penicillin allergy)"],
  "activeMedicationReview": ["Med 1", "Med 2"],
  "suggestedConsultFocus": ["Focus area 1 for discussion", "Focus area 2 for discussion"]
}`,
    user_prompt_template: `Pre-consultation data:
- Patient: {{patientName}}
- Specialty: {{specialty}}
- Chief Complaint: {{chiefComplaint}}
- Chronic Conditions: {{chronicConditions}}
- Allergies: {{allergies}}
- Active Medications: {{medications}}
- Recent Lab Findings: {{labResults}}`,
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    max_tokens: 1500,
    is_active: true,
  },
};

@Injectable()
export class AiPromptService {
  private readonly logger = new Logger(AiPromptService.name);
  private readonly promptCache: Map<string, AiPromptTemplate> = new Map();

  constructor(private readonly supabase: SupabaseService) {
    for (const [key, t] of Object.entries(DEFAULT_PROMPT_TEMPLATES)) {
      this.promptCache.set(key, { ...t });
    }
  }

  /**
   * Retrieves active prompt template for a feature.
   */
  async getActiveTemplate(feature: string): Promise<AiPromptTemplate> {
    const cached = this.promptCache.get(feature);
    if (cached) return cached;

    try {
      const { data, error } = await this.supabase.admin
        .from('ai_prompt_templates')
        .select('*')
        .eq('feature', feature)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        this.promptCache.set(feature, data);
        return data;
      }
    } catch {}

    return (
      DEFAULT_PROMPT_TEMPLATES[feature] || {
        feature,
        role: 'all',
        version: 1,
        system_prompt: 'You are a helpful healthcare assistant for HealNari.',
        user_prompt_template: '{{input}}',
        model: 'gemini-1.5-flash',
        temperature: 0.2,
        max_tokens: 2048,
        is_active: true,
      }
    );
  }

  /**
   * Interpolates template string with variables
   */
  interpolate(template: string, vars: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      const formatted =
        Array.isArray(value)
          ? value.length > 0
            ? value.join(', ')
            : 'None reported'
          : value !== undefined && value !== null
            ? String(value)
            : 'None';
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), formatted);
    }
    return result;
  }

  /**
   * Admin: List all prompt templates
   */
  async listAllTemplates(): Promise<AiPromptTemplate[]> {
    try {
      const { data, error } = await this.supabase.admin
        .from('ai_prompt_templates')
        .select('*')
        .order('feature', { ascending: true })
        .order('version', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}

    return Object.values(DEFAULT_PROMPT_TEMPLATES);
  }

  /**
   * Admin: Create or version a prompt template
   */
  async saveTemplate(template: Partial<AiPromptTemplate>): Promise<AiPromptTemplate> {
    if (!template.feature) throw new Error('Feature is required for prompt template');

    const feature = template.feature;
    const existing = await this.getActiveTemplate(feature);
    const newVersion = (existing?.version || 0) + 1;

    const newTemplate: AiPromptTemplate = {
      feature,
      role: template.role || existing.role || 'all',
      version: newVersion,
      system_prompt: template.system_prompt || existing.system_prompt,
      user_prompt_template: template.user_prompt_template || existing.user_prompt_template,
      model: template.model || existing.model || 'gemini-1.5-flash',
      temperature: template.temperature ?? existing.temperature ?? 0.2,
      max_tokens: template.max_tokens || existing.max_tokens || 2048,
      is_active: true,
    };

    this.promptCache.set(feature, newTemplate);

    try {
      await this.supabase.admin.from('ai_prompt_templates').insert(newTemplate);
    } catch (err: any) {
      this.logger.warn(`Could not save ai_prompt_templates: ${err?.message}`);
    }

    return newTemplate;
  }
}
