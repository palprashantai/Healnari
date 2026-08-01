"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
const openai_1 = require("openai");
let AiService = class AiService {
    genAI;
    openaiClient;
    constructor() {
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        if (geminiKey) {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
        }
        if (openaiKey) {
            this.openaiClient = new openai_1.OpenAI({ apiKey: openaiKey });
        }
    }
    getSystemPrompt() {
        return `You are an AI Healthcare Assistant for the FemCare platform. Your job is to translate a user's natural language query into a structured JSON database query mapped to TypeORM repository options.

DATABASE SCHEMA & ENTITIES:
1. User (Entity: "User", table: "users")
   - Columns: id, name, email, role ('admin'|'doctor'|'patient')
2. Patient (Entity: "Patient", table: "patients")
   - Columns: id, user_id, phone, city, date_of_birth
3. Doctor (Entity: "Doctor", table: "doctors")
   - Columns: id, user_id, specialization, consultation_fee, rating
4. Appointment (Entity: "Appointment", table: "appointments")
   - Columns: id, patient_id, doctor_id, appointment_date, status ('scheduled'|'completed'|'cancelled'|'no_show')
5. Prescription (Entity: "Prescription", table: "prescriptions")
   - Columns: id, patient_id, doctor_id, appointment_id, medications, instructions

JSON OUTPUT FORMAT:
You MUST respond with a JSON object ONLY, conforming to the schema below. This will be passed directly into TypeORM's repository.find() or repository.count() method options.
{
  "intent": "query" | "report",
  "targetEntity": "User" | "Patient" | "Doctor" | "Appointment" | "Prescription",
  "queryType": "find" | "count",
  "queryOptions": {
    "where": {
      "field": "value" // Exact match. Do not use operators like eq/gt. Keep it simple.
    },
    "relations": ["AssociatedEntityName"],
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
    cleanResponse(text) {
        let cleaned = text.trim();
        if (cleaned.startsWith('\`\`\`json'))
            cleaned = cleaned.substring(7);
        else if (cleaned.startsWith('\`\`\`'))
            cleaned = cleaned.substring(3);
        if (cleaned.endsWith('\`\`\`'))
            cleaned = cleaned.substring(0, cleaned.length - 3);
        return cleaned.trim();
    }
    async parseQuery(userQuery, history = []) {
        const prompt = `${this.getSystemPrompt()}\nUser Query: "${userQuery}"\n\nJSON Output:`;
        if (this.genAI) {
            try {
                const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent(prompt);
                return JSON.parse(this.cleanResponse(result.response.text()));
            }
            catch (err) {
                console.error('Gemini parsing failed:', err);
            }
        }
        throw new Error('AI credentials missing or parsing failed.');
    }
    async generateNaturalResponse(userQuery, dbResult, parsedQuery) {
        const { queryType, responseTemplate } = parsedQuery;
        if (queryType === 'count') {
            return responseTemplate.replace('{value}', dbResult);
        }
        if (Array.isArray(dbResult) && dbResult.length > 0) {
            return `Found ${dbResult.length} matching records based on your query.`;
        }
        return 'No results found in the database.';
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map