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
    system_prompt: `You are an expert clinical documentation assistant for HealNari, a women's telemedicine network.
Your mission is to generate structured, evidence-based SOAP notes (Subjective, Objective, Assessment, Plan) and a 3-bullet plain-language Patient Action Plan.
Always ground your assessment in medical facts.
Return your final answer ONLY as valid JSON matching this schema:
{
  "subjective": "Concise summary of patient symptoms, timeline, and history of presenting illness",
  "objective": "Observations, vitals or labs discussed during the video call",
  "assessment": "Provisional clinical assessment and differential considerations",
  "plan": "Numbered clinical management plan including medication recommendations, lab workups, and follow-up timeline",
  "patientActionPlan": [
    "Step 1 plain-language instruction for patient",
    "Step 2 plain-language instruction for patient",
    "Step 3 plain-language instruction for patient"
  ]
}`,
    user_prompt_template: `Generate a SOAP consultation note for:
- Patient Name: {{patientName}}
- Age: {{age}}
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
    system_prompt: `You are an empathetic medical education assistant for HealNari. Analyze the lab test report and explain it in clear, non-alarming, plain English for the patient.
Safety & Clinical Rules:
- Never provide a definitive clinical diagnosis.
- For reproductive hormones (Estradiol, Progesterone, LH, FSH, AMH, Prolactin), evaluate values taking into account the specified cycle phase.
- Explain out-of-range values calmly with physiological context.
- Include 3 intelligent questions the patient can ask their doctor.
Return ONLY a valid JSON object matching the requested schema.`,
    user_prompt_template: `Report Name: {{reportName}}
Cycle Phase Context: {{cyclePhase}}
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
    system_prompt: `You are a compassionate Patient Consultation Preparation Assistant for HealNari, a women's healthcare platform.
Your goal is to help a patient prepare for their upcoming teleconsultation with a specialist doctor.
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
    "Have your recent lab reports handy",
    "List down all current supplements and medications",
    "Note down any recent cycle date changes"
  ]
}`,
    user_prompt_template: `Prepare visit brief for:
- Doctor Specialty: {{doctorSpecialty}}
- Doctor Name: {{doctorName}}
- Patient Chief Concerns: {{concerns}}
- Recent Symptoms: {{symptoms}}
- Cycle Phase / Days: {{cycleContext}}
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
    system_prompt: `You are a clinical communications assistant for HealNari. Generate a plain-English, supportive consultation summary and patient takeaway instructions based on the doctor's consultation notes.
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
