import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AiOrchestrator } from '@/modules/ai/services/ai-orchestrator.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { resolveSupabaseToken } from '@/core/auth/supabase-token.util';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { AiChatMessage } from '../providers/ai-provider.interface';

const TOOL_DISPLAY_LABELS: Record<string, string> = {
  get_my_appointments: 'Checking your scheduled appointments...',
  get_my_prescriptions: 'Looking up your active prescriptions...',
  get_my_lab_reports: 'Retrieving your diagnostic lab records...',
  get_my_cycle_history: 'Analyzing your menstrual tracking history...',
  get_doctor_directory: 'Searching verified specialists...',
  get_available_slots: 'Checking real-time doctor availability...',
  calculate_fertility_estimate: 'Calculating fertile window & ovulation timing...',
  log_period_day: 'Recording period date in cycle journal...',
  log_biomarkers: 'Logging temperature and biomarker readings...',
  search_health_knowledge: 'Searching clinical guidelines and medical evidence...',
  get_patient_profile: 'Verifying authorized patient record...',
  get_patient_history: 'Accessing patient clinical history...',
  get_patient_prescriptions: 'Checking previous prescription history...',
  get_patient_lab_reports: 'Analyzing diagnostic biomarkers...',
  get_doctor_schedule: 'Loading consultation schedule...',
  check_drug_safety: 'Verifying pharmacology contraindications...',
  search_clinical_protocols: 'Searching ACOG & endocrine clinical protocols...',
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly orchestrator: AiOrchestrator,
    private readonly supabase: SupabaseService,
  ) {}

  async handleConnection(client: Socket) {
    client.data.history = [] as AiChatMessage[];

    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (typeof token === 'string' && token) {
      client.data.user = await this.resolveUser(token);
    } else {
      client.data.user = null;
    }
  }

  handleDisconnect(client: Socket) {
    // Clean up
  }

  private async resolveUser(token: string): Promise<AuthUser | null> {
    const identity = await resolveSupabaseToken(this.supabase.anon, token);
    if (!identity) return null;

    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', identity.id)
      .maybeSingle();
    if (!profile) return null;

    return { id: profile.id, email: identity.email as string, profile };
  }

  @SubscribeMessage('chat_message')
  async handleMessage(
    @MessageBody()
    data: { message: string; context?: 'doctor' | 'patient' | 'landing' },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { message } = data;
      const user: AuthUser | null = client.data.user ?? null;
      const history: AiChatMessage[] = client.data.history ?? [];

      const result = await this.orchestrator.processChat({
        message,
        history,
        user,
        onEvent: (event) => {
          if (event.type === 'tool_start') {
            client.emit('tool_activity', {
              status: 'executing',
              toolName: event.toolName,
              label:
                TOOL_DISPLAY_LABELS[event.toolName || ''] ||
                `Consulting ${event.toolName}...`,
            });
          } else if (event.type === 'tool_finish') {
            client.emit('tool_activity', {
              status: 'completed',
              toolName: event.toolName,
            });
          }
        },
      });

      client.data.history = result.history;

      client.emit('chat_reply', {
        status: 'success',
        data: result.reply,
        toolsUsed: result.toolsExecuted,
        creditsRemaining: result.creditsRemaining,
      });
    } catch (error: any) {
      if (error?.status === 402 || error?.response?.statusCode === 402) {
        client.emit('chat_reply', {
          status: 'paywall',
          message: error?.response?.message || 'Monthly AI credit limit reached.',
          paywallData: error?.response?.paywallData,
        });
      } else {
        client.emit('chat_reply', {
          status: 'error',
          message: error.message || 'Unable to process AI request.',
        });
      }
    }
  }
}
