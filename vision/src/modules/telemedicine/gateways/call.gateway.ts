import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { resolveSupabaseToken } from '@/core/auth/supabase-token.util';
import {
  AppointmentStatus,
  AppointmentType,
} from '@/shared/interfaces/appointment.interface';

/** Relays WebRTC SDP offers/answers and ICE candidates between exactly the
 * two participants (doctor + patient) of one video appointment. Media never
 * touches this server — it's a pure signaling broker, mirroring
 * NotificationsGateway's auth-on-connect pattern but rooming by
 * `call:<appointmentId>` instead of `user:<id>`, since a call room needs
 * both sides present rather than fanning out to one recipient. */
@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallGateway.name);

  constructor(private readonly supabase: SupabaseService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (typeof token !== 'string' || !token) return;

    const identity = await resolveSupabaseToken(this.supabase.anon, token);
    if (identity) client.data.userId = identity.id;
    // Invalid/expired token — leave userId unset; call:join will reject.
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const appointmentId = client.data.appointmentId as string | undefined;
    if (appointmentId) {
      this.logger.log(
        `disconnect: user=${client.data.userId} left call:${appointmentId} (transient socket disconnected)`,
      );
      // Transient network disconnect — notify peer with grace period before fatal drop
      client
        .to(`call:${appointmentId}`)
        .emit('call:peer-disconnected', {
          userId: client.data.userId,
          temporary: true,
          reconnectWindowSeconds: 120,
        });
    }
  }

  /** Joins the caller to the room for one appointment, after confirming they
   * are actually the patient or doctor on it and that it's a video consult. */
  @SubscribeMessage('call:join')
  async handleJoin(
    @MessageBody() body: { appointmentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.emit('call:error', { message: 'Not authenticated' });
      return;
    }

    const appointmentId = body?.appointmentId;
    if (!appointmentId) {
      client.emit('call:error', { message: 'Missing appointmentId' });
      return;
    }

    const { data: appointment } = await this.supabase.admin
      .from('appointments')
      .select('id, patient_id, doctor_id, status, type')
      .eq('id', appointmentId)
      .maybeSingle();

    if (
      !appointment ||
      (appointment.patient_id !== userId && appointment.doctor_id !== userId)
    ) {
      client.emit('call:error', {
        message: 'Not authorized for this appointment',
      });
      return;
    }
    if (appointment.type !== AppointmentType.VIDEO) {
      client.emit('call:error', {
        message: 'This appointment is not a video consultation',
      });
      return;
    }
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.DONE
    ) {
      client.emit('call:error', {
        message: 'This consultation has already ended',
      });
      return;
    }

    const room = `call:${appointmentId}`;
    client.data.appointmentId = appointmentId;

    // Single active tab guarantee: if this user already has an active socket in room, kick older socket
    const existingSockets = await this.server.in(room).fetchSockets();
    for (const s of existingSockets) {
      if (s.id !== client.id && s.data?.userId === userId) {
        this.logger.warn(`User ${userId} opened duplicate tab in ${room} — kicking older socket ${s.id}`);
        s.emit('call:duplicate-session', {
          message: 'You opened this consultation in another tab or device. This session has been paused.',
        });
        s.leave(room);
        s.data.appointmentId = undefined;
      }
    }

    client.join(room);

    const roomSockets = await this.server.in(room).fetchSockets();
    const peerAlreadyPresent = roomSockets.some((s) => s.id !== client.id);
    const isDoctor = userId === appointment.doctor_id;
    // Doctor is impolite peer; Patient is polite peer in Perfect Negotiation
    const isPolite = !isDoctor;

    this.logger.log(
      `call:join user=${userId} role=${isDoctor ? 'doctor' : 'patient'} appointment=${appointmentId} ` +
        `roomSize=${roomSockets.length} peerAlreadyPresent=${peerAlreadyPresent} isPolite=${isPolite}`,
    );

    // Update session record with join timestamp (graceful if table pending)
    const now = new Date().toISOString();
    try {
      await this.supabase.admin.from('consultation_sessions').upsert(
        {
          appointment_id: appointmentId,
          doctor_id: appointment.doctor_id,
          patient_id: appointment.patient_id,
          [isDoctor ? 'doctor_joined_at' : 'patient_joined_at']: now,
          status: peerAlreadyPresent ? 'connecting' : 'waiting',
          updated_at: now,
        },
        { onConflict: 'appointment_id' },
      );
    } catch {
      // Graceful fallback
    }

    client.emit('call:room-info', {
      peerPresent: peerAlreadyPresent,
      isPolite,
      role: isDoctor ? 'doctor' : 'patient',
    });
    client.to(room).emit('call:peer-joined', { userId, role: isDoctor ? 'doctor' : 'patient' });
  }

  @SubscribeMessage('call:offer')
  handleOffer(
    @MessageBody() body: { appointmentId: string; sdp: unknown },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `call:offer relayed appointment=${body.appointmentId} from=${client.data.userId}`,
    );
    client
      .to(`call:${body.appointmentId}`)
      .emit('call:offer', { sdp: body.sdp, from: client.data.userId });
  }

  @SubscribeMessage('call:answer')
  handleAnswer(
    @MessageBody() body: { appointmentId: string; sdp: unknown },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `call:answer relayed appointment=${body.appointmentId} from=${client.data.userId}`,
    );
    client
      .to(`call:${body.appointmentId}`)
      .emit('call:answer', { sdp: body.sdp, from: client.data.userId });
  }

  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(
    @MessageBody() body: { appointmentId: string; candidate: unknown },
    @ConnectedSocket() client: Socket,
  ) {
    client
      .to(`call:${body.appointmentId}`)
      .emit('call:ice-candidate', { candidate: body.candidate });
  }

  /** Peer explicitly confirmed WebRTC media is connected */
  @SubscribeMessage('call:connected')
  async handleConnected(
    @MessageBody() body: { appointmentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const appointmentId = body?.appointmentId || client.data.appointmentId;
    if (!appointmentId) return;

    this.logger.log(`call:connected confirmed by user=${client.data.userId} on ${appointmentId}`);
    const now = new Date().toISOString();

    try {
      await this.supabase.admin
        .from('consultation_sessions')
        .update({
          status: 'connected',
          started_at: now,
          last_connected_at: now,
          updated_at: now,
        })
        .eq('appointment_id', appointmentId)
        .is('started_at', null);

      await this.supabase.admin
        .from('appointments')
        .update({ started_at: now })
        .eq('id', appointmentId)
        .is('started_at', null);
    } catch {
      // Graceful fallback
    }

    client.to(`call:${appointmentId}`).emit('call:peer-connected', { userId: client.data.userId });
  }

  /** Lets a peer announce it muted/unmuted or turned its camera on/off */
  @SubscribeMessage('call:media-state')
  handleMediaState(
    @MessageBody()
    body: { appointmentId: string; muted?: boolean; videoOff?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`call:${body.appointmentId}`).emit('call:peer-media-state', {
      muted: body.muted,
      videoOff: body.videoOff,
    });
  }

  /** Peer explicitly leaves the consultation room (intentional exit) */
  @SubscribeMessage('call:leave')
  handleLeave(
    @MessageBody() body: { appointmentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `call:${body.appointmentId}`;
    this.logger.log(
      `call:leave intentional: user=${client.data.userId} appointment=${body.appointmentId}`,
    );
    client.to(room).emit('call:peer-left', { userId: client.data.userId, intentional: true });
    client.leave(room);
    client.data.appointmentId = undefined;
  }

  /** Doctor completes/ends the consultation session */
  @SubscribeMessage('call:end')
  async handleEndCall(
    @MessageBody() body: { appointmentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `call:${body.appointmentId}`;
    this.logger.log(
      `call:end doctor ended consultation user=${client.data.userId} appointment=${body.appointmentId}`,
    );
    client.to(room).emit('call:ended', { by: client.data.userId });
    client.leave(room);
    client.data.appointmentId = undefined;
  }
}
