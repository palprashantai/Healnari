import { Test } from '@nestjs/testing';
import { AiToolRegistry } from '../src/modules/ai/tools/ai-tool.registry';
import { AiAgentResolverService } from '../src/modules/ai/services/ai-agent-resolver.service';
import { SupabaseService } from '../src/core/supabase/supabase.service';
import { PatientsService } from '../src/modules/patients/services/patients.service';
import { AppointmentsService } from '../src/modules/appointments/services/appointments.service';
import { RecordsService } from '../src/modules/records/services/records.service';
import { DoctorsService } from '../src/modules/doctors/services/doctors.service';
import { AiFeatureFlagService } from '../src/modules/ai/services/ai-feature-flag.service';
import { ProfileRole } from '../src/shared/interfaces/profile.interface';
import { ForbiddenException } from '@nestjs/common';

async function testSecurityIsolation() {
  console.log('=== HEALNARI MULTI-AGENT SECURITY ISOLATION TEST ===\n');

  const mockSupabase = {
    admin: {
      from: () => ({
        select: () => ({ eq: () => ({ is: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) }),
      }),
    },
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      AiToolRegistry,
      AiAgentResolverService,
      { provide: SupabaseService, useValue: mockSupabase },
      { provide: PatientsService, useValue: {} },
      { provide: AppointmentsService, useValue: {} },
      { provide: RecordsService, useValue: {} },
      { provide: DoctorsService, useValue: { search: async () => [] } },
      { provide: AiFeatureFlagService, useValue: { isEnabled: () => true } },
    ],
  }).compile();

  const toolRegistry = moduleRef.get(AiToolRegistry);
  const agentResolver = moduleRef.get(AiAgentResolverService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${label}`);
      failed++;
    }
  }

  // ── 1. Landing Agent Isolation ──
  console.log('Test Suite 1: Landing Agent Schema Isolation');
  const visitorAgent = agentResolver.resolveAgent(null);
  assert(visitorAgent.agentType === 'LANDING', 'Unauthenticated user resolves strictly to LANDING agent');
  assert(visitorAgent.isPublic === true, 'Landing agent is public');

  const landingTools = toolRegistry.getAvailableTools({
    user: null,
    role: 'visitor',
    agentType: 'LANDING',
  });
  const landingToolNames = landingTools.map((t) => t.name);

  assert(!landingToolNames.includes('get_patient_profile'), 'Landing Agent NEVER declares doctor tool "get_patient_profile"');
  assert(!landingToolNames.includes('get_my_prescriptions'), 'Landing Agent NEVER declares patient tool "get_my_prescriptions"');
  assert(!landingToolNames.includes('get_my_appointments'), 'Landing Agent NEVER declares patient tool "get_my_appointments"');
  assert(landingToolNames.includes('get_public_specialties'), 'Landing Agent declares public tool "get_public_specialties"');
  assert(landingToolNames.includes('get_doctor_directory'), 'Landing Agent declares public tool "get_doctor_directory"');

  // ── 2. Landing Agent Execution Guard ──
  console.log('\nTest Suite 2: Landing Agent Hard Execution Guard');
  let blocked = false;
  try {
    await toolRegistry.executeTool('get_patient_profile', { patientId: 'some-id' }, {
      user: null,
      role: 'visitor',
      agentType: 'LANDING',
    });
  } catch (err: any) {
    blocked = err instanceof ForbiddenException;
  }
  assert(blocked, 'Landing Agent attempting to execute doctor tool throws ForbiddenException');

  // ── 3. Patient Agent Schema & Execution Isolation ──
  console.log('\nTest Suite 3: Patient Agent Isolation');
  const patientUser: any = { id: 'patient-123', profile: { role: ProfileRole.PATIENT } };
  const patientAgent = agentResolver.resolveAgent(patientUser);
  assert(patientAgent.agentType === 'PATIENT', 'Patient resolves strictly to PATIENT agent');

  const patientTools = toolRegistry.getAvailableTools({
    user: patientUser,
    role: ProfileRole.PATIENT,
    agentType: 'PATIENT',
  });
  const patientToolNames = patientTools.map((t) => t.name);

  assert(!patientToolNames.includes('get_patient_profile'), 'Patient Agent NEVER declares doctor tool "get_patient_profile"');
  assert(patientToolNames.includes('get_my_appointments'), 'Patient Agent declares "get_my_appointments"');
  assert(patientToolNames.includes('get_my_prescriptions'), 'Patient Agent declares "get_my_prescriptions"');

  let patientBlocked = false;
  try {
    await toolRegistry.executeTool('get_patient_profile', { patientId: 'target-id' }, {
      user: patientUser,
      role: ProfileRole.PATIENT,
      agentType: 'PATIENT',
    });
  } catch (err: any) {
    patientBlocked = err instanceof ForbiddenException;
  }
  assert(patientBlocked, 'Patient Agent attempting to execute doctor tool throws ForbiddenException');

  // ── 4. Doctor Agent Schema & KYC Isolation ──
  console.log('\nTest Suite 4: Doctor Agent & KYC Isolation');
  const unverifiedDoctor: any = { id: 'doc-unverified', profile: { role: ProfileRole.DOCTOR, kyc_verified: false } };
  const doctorToolsUnverified = toolRegistry.getAvailableTools({
    user: unverifiedDoctor,
    role: ProfileRole.DOCTOR,
    agentType: 'DOCTOR',
    isDoctorVerified: false,
  });
  const unverifiedToolNames = doctorToolsUnverified.map((t) => t.name);
  assert(!unverifiedToolNames.includes('get_patient_profile'), 'Unverified Doctor CANNOT see clinical tool "get_patient_profile"');

  const verifiedDoctor: any = { id: 'doc-verified', profile: { role: ProfileRole.DOCTOR, kyc_verified: true } };
  const doctorToolsVerified = toolRegistry.getAvailableTools({
    user: verifiedDoctor,
    role: ProfileRole.DOCTOR,
    agentType: 'DOCTOR',
    isDoctorVerified: true,
  });
  const verifiedToolNames = doctorToolsVerified.map((t) => t.name);
  assert(verifiedToolNames.includes('get_patient_profile'), 'Verified Doctor sees clinical tool "get_patient_profile"');
  assert(!verifiedToolNames.includes('get_my_cycle_history'), 'Doctor Agent NEVER sees patient cycle tracking "get_my_cycle_history"');

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

testSecurityIsolation().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
