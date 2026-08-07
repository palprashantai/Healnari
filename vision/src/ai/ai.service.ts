import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

/**
 * Server-side allow-list for /api/chat. The LLM's JSON output is never trusted
 * directly against the DB: only these entities exist as far as the query
 * executor is concerned, and only these columns can ever be selected/filtered/
 * sorted on. This deliberately excludes User (password_hash) and Prescription
 * (clinical record content) — the chat assistant is for operational aggregate
 * questions ("how many appointments today"), not a general data browser.
 * Relations are never allowed, since traversing them (e.g. Appointment ->
 * Patient -> User) would bypass this same column allow-list on the related
 * entity.
 */
export const ALLOWED_QUERY_ENTITIES: Record<string, { select: string[] }> = {
  Patient: { select: ['id', 'city'] },
  Doctor: { select: ['id', 'specialization', 'consultation_fee', 'rating'] },
  Appointment: { select: ['id', 'appointment_date', 'status'] },
};

const MAX_TAKE = 25;

function isPlainScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private openaiClient: OpenAI;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
    }
  }

  private getSystemPrompt(): string {
    return `You are an AI Operations Assistant for the HealNari platform. Your job is to translate a user's natural language query into a structured JSON database query. This is a read-only, aggregate-stats assistant — not a patient record lookup tool.

DATABASE SCHEMA & ENTITIES (only these are queryable; nothing else exists as far as you're concerned):
1. Patient (Entity: "Patient")
   - Columns: id, city
2. Doctor (Entity: "Doctor")
   - Columns: id, specialization, consultation_fee, rating
3. Appointment (Entity: "Appointment")
   - Columns: id, appointment_date, status ('scheduled'|'completed'|'cancelled'|'no_show')

Relations/joins are not supported — never include a "relations" field. Results are capped at ${MAX_TAKE} rows.

JSON OUTPUT FORMAT:
You MUST respond with a JSON object ONLY, conforming to the schema below.
{
  "intent": "query" | "report",
  "targetEntity": "Patient" | "Doctor" | "Appointment",
  "queryType": "find" | "count",
  "queryOptions": {
    "where": {
      "field": "value" // Exact match on one of the columns listed above only. Do not use operators like eq/gt. Keep it simple.
    },
    "take": 10,
    "order": { "field": "ASC" | "DESC" }
  },
  "responseTemplate": "string template explaining how to describe the results, using {value} or {list}"
}

EXAMPLE: "How many appointments are scheduled?"
{
  "intent": "query",
  "targetEntity": "Appointment",
  "queryType": "count",
  "queryOptions": { "where": { "status": "scheduled" } },
  "responseTemplate": "There are currently {value} scheduled appointments."
}`;
  }

  /**
   * Re-derives a safe query from the LLM's output instead of trusting it.
   * Unknown entities are rejected; columns/relations outside the allow-list
   * are silently dropped rather than passed to TypeORM. Throws if the
   * requested entity isn't in ALLOWED_QUERY_ENTITIES.
   */
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

  private cleanResponse(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith('\`\`\`json')) cleaned = cleaned.substring(7);
    else if (cleaned.startsWith('\`\`\`')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('\`\`\`')) cleaned = cleaned.substring(0, cleaned.length - 3);
    return cleaned.trim();
  }

  async parseQuery(userQuery: string, history: any[] = []): Promise<any> {
    const prompt = `${this.getSystemPrompt()}\nUser Query: "${userQuery}"\n\nJSON Output:`;

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return JSON.parse(this.cleanResponse(result.response.text()));
      } catch (err) {
        console.error('Gemini parsing failed:', err);
      }
    }

    throw new Error('AI credentials missing or parsing failed.');
  }

  async generateNaturalResponse(userQuery: string, dbResult: any, parsedQuery: any): Promise<string> {
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
