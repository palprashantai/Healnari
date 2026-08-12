import {
  WebSocketGateway,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { resolveSupabaseToken } from '@/core/auth/supabase-token.util';

/** Pushes real-time notification events to a signed-in user. Mirrors the
 * handshake-token auth pattern from ChatGateway, but rooms clients by user
 * id (`user:<id>`) so a specific patient/doctor can be targeted by id
 * rather than broadcasting to everyone connected. Anonymous connections
 * (no/invalid token) simply never join a room and never receive anything. */
@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly supabase: SupabaseService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (typeof token !== 'string' || !token) return;

    const identity = await resolveSupabaseToken(this.supabase.anon, token);
    if (identity) client.join(`user:${identity.id}`);
    // Invalid/expired token — leave the socket unjoined rather than failing the connection.
  }

  handleDisconnect(@ConnectedSocket() _client: Socket) {}

  /** Fan out a notification row to the recipient's live socket(s), if connected. */
  emitToUser(userId: string, notification: unknown) {
    this.server?.to(`user:${userId}`).emit('notification', notification);
  }
}
