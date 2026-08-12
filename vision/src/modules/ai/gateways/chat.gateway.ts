import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Content } from '@google/generative-ai';
import { AiService } from '@/modules/ai/services/ai.service';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { resolveSupabaseToken } from '@/core/auth/supabase-token.util';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
// Public access is intentional for the landing-page assistant. Patient/doctor
// contexts resolve identity from the handshake token below (best-effort —
// an invalid/missing token just means tool calls that need identity, like
// logging a period day, ask the visitor to sign in rather than failing the
// whole connection).

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly aiService: AiService,
    private readonly supabase: SupabaseService,
  ) { }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.data.history = [] as Content[];

    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (typeof token === 'string' && token) {
      client.data.user = await this.resolveUser(token);
    } else {
      client.data.user = null;
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  private async resolveUser(token: string): Promise<AuthUser | null> {
    const identity = await resolveSupabaseToken(this.supabase.anon, token);
    if (!identity) return null;

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', identity.id).single();
    if (!profile) return null;

    return { id: profile.id, email: identity.email as string, profile };
  }

  @SubscribeMessage('chat_message')
  async handleMessage(
    @MessageBody() data: { message: string; context: 'doctor' | 'patient' | 'landing' },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { message, context } = data;
      const user: AuthUser | null = client.data.user ?? null;
      const history: Content[] = client.data.history ?? [];

      const { text, history: updatedHistory } = await this.aiService.processQuery(message, context, user, history);
      client.data.history = updatedHistory;

      client.emit('chat_reply', { status: 'success', data: text });
    } catch (error) {
      client.emit('chat_reply', { status: 'error', message: error.message });
    }
  }
}
