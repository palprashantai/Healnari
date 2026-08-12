import { Injectable } from '@nestjs/common';
import { Content, GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { PatientsService } from '@/modules/patients/services/patients.service';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

/**
 * Server-side allow-list for /api/chat. 
 */
export const ALLOWED_QUERY_ENTITIES: Record<string, { select: string[] }> = {
  Profile: { select: ['id', 'role', 'specialty', 'consultation_fee'] },
  PatientRecord: { select: ['id', 'blood_group'] },
  Appointment: { select: ['id', 'scheduled_date', 'status'] },
};

const MAX_TAKE = 25;

/** Mirrors QuickFertilityEstimateDto — the same three inputs the Fertility
 * page's "Quick Estimate" form asks for, gathered conversationally instead.
 * The model is instructed (see handlePatientAgent's systemInstruction) to
 * keep asking/confirming until it has current values for all three, and to
 * always use the patient's latest answer if they change one — that's what
 * makes "the date can change too" actually work, since each turn shares the
 * same chat history rather than starting fresh. */
const calculateFertilityEstimateDeclaration: FunctionDeclaration = {
  name: 'calculateFertilityEstimate',
  description: "Calculates the patient's fertile window and estimated ovulation date from their last period start date, period length, and cycle length. Call this only once you have a confirmed, current value for all three — if the patient corrects an earlier answer, use their newest value.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      lastPeriodStart: {
        type: SchemaType.STRING,
        description: 'The first day of the last menstrual period, as YYYY-MM-DD. Convert relative answers ("last Tuesday", "5 days ago") to an absolute date using today\'s date.',
      },
      periodDurationDays: { type: SchemaType.NUMBER, description: 'How many days the period usually lasts. Typically 3-7.' },
      cycleLengthDays: { type: SchemaType.NUMBER, description: 'Days from the start of one period to the start of the next. Typically 21-35; default to 28 if the patient is unsure.' },
    },
    required: ['lastPeriodStart', 'periodDurationDays', 'cycleLengthDays'],
  },
} as any as FunctionDeclaration;

const logPeriodDayDeclaration: FunctionDeclaration = {
  name: 'logPeriodDay',
  description: "Logs a single specific date as a period (menstrual flow) day in the patient's tracking history. Use this when the patient just wants to record a period day, without asking for a fertile-window calculation.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      date: { type: SchemaType.STRING, description: 'The date to log, as YYYY-MM-DD. Convert relative answers ("today", "yesterday") using today\'s date.' },
    },
    required: ['date'],
  },
} as any as FunctionDeclaration;

function isPlainScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

const queryDatabaseDeclaration: FunctionDeclaration = {
  name: 'queryDatabase',
  description: 'Queries the database for aggregate statistics. Translates a natural language query into a structured database query. Relations are not supported.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      targetEntity: {
        type: SchemaType.STRING,
        description: 'The entity to query',
        enum: ['Profile', 'PatientRecord', 'Appointment'],
      },
      queryType: {
        type: SchemaType.STRING,
        description: 'The type of query',
        enum: ['find', 'count'],
      },
      queryOptions: {
        type: SchemaType.OBJECT,
        description: 'Options for the query including where, take, and order',
        properties: {
          where: {
            type: SchemaType.OBJECT,
            description: 'Key-value pairs for exact match filtering on allowed columns',
          },
          take: {
            type: SchemaType.NUMBER,
            description: 'Limit results, max 25',
          },
          order: {
            type: SchemaType.OBJECT,
            description: 'Order by field, e.g. { created_at: "ASC" }',
          }
        },
      },
      responseTemplate: {
        type: SchemaType.STRING,
        description: 'A natural language template explaining how to describe the results, using {value} for counts or {list} for arrays.',
      }
    },
    required: ['targetEntity', 'queryType', 'responseTemplate'],
  },
} as any as FunctionDeclaration;

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private openaiClient: OpenAI;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly patientsService: PatientsService,
  ) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
    }
  }

  // --- Router ---
  // `history` and the returned `history` are the chat's full turn-by-turn
  // memory for this socket connection (see ChatGateway) — without threading
  // this through, every message would be answered with no memory of what the
  // patient already said, which is what made the old multi-question fertility
  // flow unable to track or correct answers at all.
  async processQuery(
    message: string,
    context: 'doctor' | 'patient' | 'landing',
    user: AuthUser | null,
    history: Content[],
  ): Promise<{ text: string; history: Content[] }> {
    switch (context) {
      case 'doctor':
        return { text: await this.handleDoctorAgent(message), history };
      case 'patient':
        return this.handlePatientAgent(message, user, history);
      case 'landing':
        return { text: await this.handleLandingAgent(message), history };
      default:
        throw new Error('Unknown context');
    }
  }

  // --- Agents ---

  private async handleDoctorAgent(userQuery: string): Promise<string> {
    const parsedQuery = await this.parseQuery(userQuery);
    const safeQuery = this.sanitizeQueryOptions(parsedQuery);

    const { targetEntity, queryType, queryOptions } = safeQuery;
    let dbResult: any = null;

    // Use admin client for simplicity in this aggregate stats bot
    const client = this.supabaseService.admin;

    let query = client.from(targetEntity).select(queryOptions.select.join(','), {
      count: queryType === 'count' ? 'exact' : undefined,
      head: queryType === 'count',
    });

    if (queryOptions.where) {
      for (const [key, val] of Object.entries(queryOptions.where)) {
        query = query.eq(key, val);
      }
    }

    if (queryType === 'find') {
      if (queryOptions.order) {
        for (const [key, val] of Object.entries(queryOptions.order)) {
          query = query.order(key, { ascending: val === 'ASC' });
        }
      }
      query = query.limit(queryOptions.take);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Supabase query error:', error);
      throw new Error('Database query failed.');
    }

    dbResult = queryType === 'count' ? count : data;
    return this.generateNaturalResponse(dbResult, parsedQuery);
  }

  /** Real conversational memory (via `history`) plus two tools that write to
   * the patient's actual data: calculateFertilityEstimate (the same DTO/logic
   * the Fertility page's Quick Estimate form uses) and logPeriodDay. Because
   * the full turn history is replayed into the model every time, the patient
   * can correct an earlier answer ("actually it was the 3rd") and the model
   * carries that correction into the eventual function call — that's the fix
   * for "the period date can change, so let them set it manually". */
  private async handlePatientAgent(userQuery: string, user: AuthUser | null, history: Content[]): Promise<{ text: string; history: Content[] }> {
    if (!this.genAI) throw new Error('AI not configured.');

    const today = new Date().toISOString().slice(0, 10);
    const systemInstruction = `You are a warm, plain-language Patient Assistant for HealNari, a women's health app. Today's date is ${today}.

When a patient asks about their fertile window, ovulation, or period prediction, gather these three things conversationally, one at a time rather than all at once:
1. The first day of their last period (accept relative answers like "last Tuesday" or "5 days ago" and convert to YYYY-MM-DD using today's date).
2. How many days their period usually lasts.
3. How many days from the start of one period to the start of the next.

If the patient corrects or changes an answer they already gave, always use their latest value — confirm the update in one short sentence and continue, never argue with a correction.

Once you have a current value for all three, call calculateFertilityEstimate. If the patient just wants to record that their period started on a specific day, without asking for a calculation, call logPeriodDay instead.

Keep replies short and non-technical. Never give a medical diagnosis, never invent medical facts, and never state a probability or certainty about what a symptom means.

If the patient describes any of the following, do not continue the normal conversation — respond only with an urgent-care message telling them to seek emergency medical care immediately (or call their local emergency number) and stop there: very heavy bleeding (soaking a pad/tampon in under an hour), severe or worsening abdominal/pelvic pain, chest pain or difficulty breathing, fainting or severe dizziness, or any mention of self-harm or suicidal thoughts. For self-harm or suicidal thoughts specifically, also tell them they don't have to be alone with this and to reach out to a crisis helpline or emergency services right now.

For anything else that sounds concerning but isn't urgent, suggest seeing a doctor rather than assessing it yourself.`;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ functionDeclarations: [calculateFertilityEstimateDeclaration, logPeriodDayDeclaration] }],
      systemInstruction,
    });

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(userQuery);
    const call = result.response.functionCalls()?.[0];

    if (call) {
      if (!user || user.profile.role !== 'patient') {
        const text = "I can do that once you're signed in as a patient — please log in and ask me again.";
        return { text, history: await chat.getHistory() };
      }

      let functionResponsePayload: Record<string, unknown>;
      try {
        if (call.name === 'calculateFertilityEstimate') {
          const args = call.args as { lastPeriodStart: string; periodDurationDays: number; cycleLengthDays: number };
          functionResponsePayload = await this.patientsService.quickFertilityEstimate(user, {
            lastPeriodStart: args.lastPeriodStart,
            periodDurationDays: Math.round(args.periodDurationDays),
            cycleLengthDays: Math.round(args.cycleLengthDays),
          }) as unknown as Record<string, unknown>;
        } else if (call.name === 'logPeriodDay') {
          const args = call.args as { date: string };
          const log = await this.patientsService.logCycle(user, args.date, { flow: 'Medium' });
          functionResponsePayload = { logged: true, date: args.date, log };
        } else {
          functionResponsePayload = { error: `Unknown function: ${call.name}` };
        }
      } catch (err: any) {
        functionResponsePayload = { error: err?.message || 'Something went wrong while saving that.' };
      }

      result = await chat.sendMessage([{ functionResponse: { name: call.name, response: functionResponsePayload } }]);
    }

    return { text: result.response.text(), history: await chat.getHistory() };
  }

  private async handleLandingAgent(userQuery: string): Promise<string> {
    if (!this.genAI) throw new Error('AI not configured.');

    // 1. Generate an embedding for the user's query
    const embedModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embedResult = await embedModel.embedContent(userQuery);
    const queryEmbedding = embedResult.embedding.values;

    // 2. Query the vector database using the RPC function
    const { data, error } = await this.supabaseService.admin.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3,
    });

    if (error) {
      console.error('Vector search error:', error);
      // Fallback if RAG fails (e.g. table empty or pgvector not set up yet)
      return "I'm having trouble searching the knowledge base right now. Please try again later.";
    }

    const contextTexts = (data || []).map((doc: any) => doc.content).join('\n\n');

    // 3. Generate response using the RAG context
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    // AUDIT_REPORT.md AI-2 — this is the one AI surface reachable by anyone
    // with no login, and it previously had no medical-safety instruction at
    // all (unlike the patient agent above and the consult-brief
    // summarizer). Same guardrails apply here even though this prompt is
    // mostly answering product/pricing/logistics questions, since a visitor
    // can still type a symptom question into it.
    const prompt = `You are a friendly assistant for HealNari's public landing page, answering questions from visitors who are not logged in.

Use the following context from our knowledge base to answer the user's question. If the answer isn't in the context, say you don't know but offer to connect them with support — never guess or invent an answer.

You are not a doctor and must never diagnose, suggest a treatment, or state what a symptom means. If the user describes a medical symptom or concern, say you can't advise on that and suggest booking a consultation with a HealNari doctor. If they describe a medical emergency (severe pain, heavy bleeding, chest pain/difficulty breathing, fainting, self-harm or suicidal thoughts), tell them to seek emergency care immediately or contact a crisis helpline, and do not attempt to otherwise answer.

Context:
${contextTexts || 'No relevant information found in knowledge base.'}

User Query: ${userQuery}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /** Plain-language 2-3 sentence brief for a doctor about to start a
   * consultation, built ONLY from the facts passed in — the prompt is
   * explicit that it must not invent or infer anything not listed. Returns
   * null (not a thrown error) when Gemini isn't configured, so the
   * consult-brief endpoint can still show the structured facts on their own
   * instead of failing the whole request over a missing API key. */
  async summarizeForConsult(facts: {
    patientName: string;
    reason?: string;
    chronicConditions: string[];
    allergies: string[];
    currentMedications: string[];
    recentLabReports: { name: string; status: string }[];
  }): Promise<string | null> {
    if (!this.genAI) return null;
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `You are preparing a short brief for a doctor about to start a consultation. Using ONLY the facts listed below, write a concise 2-3 sentence plain-language summary. Do not invent, assume, or infer any medical information that isn't explicitly listed. If a section says "None recorded", do not mention it as a finding — just leave it out.

Patient: ${facts.patientName}
Reason for this visit: ${facts.reason || 'Not specified'}
Chronic conditions on file: ${facts.chronicConditions.length ? facts.chronicConditions.join(', ') : 'None recorded'}
Known allergies: ${facts.allergies.length ? facts.allergies.join(', ') : 'None recorded'}
Current medications: ${facts.currentMedications.length ? facts.currentMedications.join(', ') : 'None recorded'}
Recent lab reports: ${facts.recentLabReports.length ? facts.recentLabReports.map((r) => `${r.name} (${r.status})`).join(', ') : 'None recorded'}`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch {
      return null;
    }
  }

  // --- Helpers ---

  sanitizeQueryOptions(parsedQuery: any): {
    targetEntity: string;
    queryType: 'find' | 'count' | 'unsupported';
    queryOptions: { select: string[]; where?: Record<string, unknown>; take: number; order?: Record<string, 'ASC' | 'DESC'> };
  } {
    const entity = typeof parsedQuery?.targetEntity === 'string' ? parsedQuery.targetEntity : '';
    const allowed = ALLOWED_QUERY_ENTITIES[entity];
    if (!allowed) {
      throw new Error(`Querying "${entity || 'unknown entity'}" is not permitted through the chat assistant.`);
    }

    const rawWhere = parsedQuery?.queryOptions?.where;
    const where: Record<string, unknown> = {};
    if (rawWhere && typeof rawWhere === 'object') {
      for (const key of Object.keys(rawWhere)) {
        if (allowed.select.includes(key) && isPlainScalar(rawWhere[key])) {
          where[key] = rawWhere[key];
        }
      }
    }

    const rawTake = Number(parsedQuery?.queryOptions?.take);
    const take = Number.isFinite(rawTake) && rawTake > 0 ? Math.min(Math.floor(rawTake), MAX_TAKE) : MAX_TAKE;

    const rawOrder = parsedQuery?.queryOptions?.order;
    const order: Record<string, 'ASC' | 'DESC'> = {};
    if (rawOrder && typeof rawOrder === 'object') {
      for (const key of Object.keys(rawOrder)) {
        const direction = rawOrder[key];
        if (allowed.select.includes(key) && (direction === 'ASC' || direction === 'DESC')) {
          order[key] = direction;
        }
      }
    }

    const queryType = parsedQuery?.queryType === 'find' || parsedQuery?.queryType === 'count'
      ? parsedQuery.queryType
      : 'unsupported';

    return {
      targetEntity: entity,
      queryType,
      queryOptions: {
        select: allowed.select,
        where: Object.keys(where).length ? where : undefined,
        take,
        order: Object.keys(order).length ? order : undefined,
      },
    };
  }

  async parseQuery(userQuery: string): Promise<any> {
    if (this.genAI) {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        tools: [{ functionDeclarations: [queryDatabaseDeclaration] }],
      });
      
      const result = await model.generateContent(`You are an AI Operations Assistant for the HealNari platform. Please answer this user query using the queryDatabase tool: "${userQuery}"`);
      const call = result.response.functionCalls()?.[0];
      
      if (call && call.name === 'queryDatabase') {
        return call.args;
      }
      
      throw new Error('Model did not return a valid queryDatabase function call. Response: ' + result.response.text());
    }
    throw new Error('AI credentials missing or parsing failed.');
  }

  generateNaturalResponse(dbResult: any, parsedQuery: any): string {
    const { queryType, responseTemplate } = parsedQuery;

    if (queryType === 'count') {
      return responseTemplate.replace('{value}', dbResult);
    }

    if (Array.isArray(dbResult) && dbResult.length > 0) {
      return `Found ${dbResult.length} matching records based on your query.`;
    }

    return 'No results found in the database.';
  }
}
