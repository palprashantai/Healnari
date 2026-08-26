import { AiService } from '@/modules/ai/services/ai.service';
import { createSupabaseMock } from '@/test-utils/supabase-mock';

describe('AiService — Safety, JSON Extraction, and RAG Resilience', () => {
  let service: AiService;
  const { supabase } = createSupabaseMock({});
  const patientsService = {
    computeFertilityPrediction: jest.fn().mockResolvedValue({}),
    logDay: jest.fn().mockResolvedValue({}),
    logBiomarkers: jest.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    service = new AiService(supabase as any, patientsService as any);
  });

  describe('safeJsonParse', () => {
    it('successfully parses clean standard JSON', () => {
      const input = '{"drugName":"Metformin","dosage":"500mg"}';
      const result = service.safeJsonParse(input, { drugName: 'Fallback' });
      expect(result).toEqual({ drugName: 'Metformin', dosage: '500mg' });
    });

    it('extracts valid JSON enclosed in markdown code fences', () => {
      const input =
        '```json\n{\n  "status": "NORMAL",\n  "explanation": "Healthy biomarker"\n}\n```';
      const result = service.safeJsonParse(input, { status: 'UNKNOWN' });
      expect(result).toEqual({
        status: 'NORMAL',
        explanation: 'Healthy biomarker',
      });
    });

    it('returns default fallback object when JSON is completely invalid or truncated', () => {
      const input = 'This is plain text without any valid JSON structure';
      const fallback = { status: 'SAFE_FALLBACK', count: 0 };
      const result = service.safeJsonParse(input, fallback);
      expect(result).toEqual(fallback);
    });

    it('handles empty, null, or undefined inputs gracefully', () => {
      const fallback = { valid: false };
      expect(service.safeJsonParse('', fallback)).toEqual(fallback);
      expect(service.safeJsonParse(null as any, fallback)).toEqual(fallback);
      expect(service.safeJsonParse(undefined as any, fallback)).toEqual(
        fallback,
      );
    });
  });

  describe('sanitizeQueryOptions', () => {
    it('allows permitted entity queries and enforces maximum take limits', () => {
      const parsed = {
        targetEntity: 'Profile',
        queryType: 'find',
        queryOptions: {
          take: 100, // exceeds max allowable limit of 25
          where: { specialty: 'Gynecology' },
        },
      };

      const sanitized = service.sanitizeQueryOptions(parsed);
      expect(sanitized.targetEntity).toBe('Profile');
      expect(sanitized.queryOptions.take).toBeLessThanOrEqual(25);
      expect(sanitized.queryOptions.where).toEqual({ specialty: 'Gynecology' });
    });

    it('rejects unauthorized entity queries with a descriptive security error', () => {
      const maliciousQuery = {
        targetEntity: 'passwords_or_auth_secrets',
        queryType: 'find',
      };

      expect(() => service.sanitizeQueryOptions(maliciousQuery)).toThrow(
        /is not permitted through the chat assistant/,
      );
    });
  });

  describe('Clinical Tools Fallback Resilience', () => {
    it('returns structured fallback SOAP note when AI credentials are unavailable', async () => {
      const facts = {
        patientName: 'Ananya Sharma',
        chiefComplaint: 'Irregular cycles and pelvic discomfort',
        duration: '3 months',
      };

      const soap = await service.generateSoapNotes(facts);
      expect(soap).toHaveProperty('subjective');
      expect(soap).toHaveProperty('assessment');
      expect(soap).toHaveProperty('plan');
      expect(soap.subjective).toContain('Ananya Sharma');
    });

    it('returns structured drug interaction guidance for active medication list', async () => {
      const meds = ['Metformin 500mg', 'Folic Acid 5mg'];
      const analysis = await service.checkDrugInteractions(meds);
      expect(analysis).toHaveProperty('guidelines');
      expect(analysis).toHaveProperty('foodRules');
      expect(analysis.guidelines.length).toBe(2);
    });
  });
});
