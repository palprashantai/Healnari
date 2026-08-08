import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { SupabaseService } from '@/core/supabase/supabase.service';

/**
 * Server-side allow-list for /api/chat. 
 */
export const ALLOWED_QUERY_ENTITIES: Record<string, { select: string[] }> = {
  Profile: { select: ['id', 'role', 'specialty', 'consultation_fee'] },
  PatientRecord: { select: ['id', 'blood_group'] },
  Appointment: { select: ['id', 'scheduled_date', 'status'] },
};

const MAX_TAKE = 25;

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

  constructor(private readonly supabaseService: SupabaseService) {
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
  async processQuery(message: string, context: 'doctor' | 'patient' | 'landing'): Promise<string> {
    switch (context) {
      case 'doctor':
        return this.handleDoctorAgent(message);
      case 'patient':
        return this.handlePatientAgent(message);
      case 'landing':
        return this.handleLandingAgent(message);
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

  private async handlePatientAgent(userQuery: string): Promise<string> {
    // Basic patient agent implementation. Could use a 'bookAppointment' tool here.
    if (!this.genAI) throw new Error('AI not configured.');
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a helpful Patient Assistant for HealNari. Answer this: ${userQuery}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
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
    const prompt = `You are a friendly customer service assistant for HealNari's landing page. 
Use the following context from our knowledge base to answer the user's question. If the answer isn't in the context, say you don't know but offer to connect them with support.

Context:
${contextTexts || 'No relevant information found in knowledge base.'}

User Query: ${userQuery}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
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
