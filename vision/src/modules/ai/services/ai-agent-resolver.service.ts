import { Injectable } from '@nestjs/common';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';

export type HealNariAgentType = 'LANDING' | 'DOCTOR' | 'PATIENT';

export interface ResolvedAgent {
  agentType: HealNariAgentType;
  agentName: string;
  isPublic: boolean;
  isDoctorVerified?: boolean;
}

@Injectable()
export class AiAgentResolverService {
  /**
   * Deterministically resolves agent identity strictly from server-verified authentication context.
   * Clients can NEVER spoof or select an agent role.
   */
  resolveAgent(user: AuthUser | null, forcedAgentType?: HealNariAgentType): ResolvedAgent {
    // 1. Unauthenticated Visitor
    if (!user) {
      return {
        agentType: 'LANDING',
        agentName: 'Ask HealNari',
        isPublic: true,
      };
    }

    const role = user.profile?.role;

    // 2. Doctor Session
    if (role === ProfileRole.DOCTOR) {
      // If doctor is visiting public landing page and explicitly queries public assistant, allow LANDING agent
      if (forcedAgentType === 'LANDING') {
        return {
          agentType: 'LANDING',
          agentName: 'Ask HealNari',
          isPublic: true,
        };
      }
      return {
        agentType: 'DOCTOR',
        agentName: 'Doctor Copilot',
        isPublic: false,
        isDoctorVerified: Boolean(user.profile.kyc_verified),
      };
    }

    // 3. Patient Session
    if (role === ProfileRole.PATIENT) {
      // If patient is visiting public landing page and explicitly queries public assistant, allow LANDING agent
      if (forcedAgentType === 'LANDING') {
        return {
          agentType: 'LANDING',
          agentName: 'Ask HealNari',
          isPublic: true,
        };
      }
      return {
        agentType: 'PATIENT',
        agentName: 'HealNari Health Assistant',
        isPublic: false,
      };
    }

    // 4. Admin or other roles default to Landing Agent unless specific toolset is configured
    return {
      agentType: 'LANDING',
      agentName: 'Ask HealNari',
      isPublic: true,
    };
  }
}
