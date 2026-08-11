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
import { SupabaseService } from '@/core/supabase/supabase.service';
import { AppointmentStatus, AppointmentType } from '@/shared/interfaces/appointment.interface';

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

  constructor(private readonly supabase: SupabaseService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (typeof token !== 'string' || !token) return;

    try {
      const { data: userResponse, error } = await this.supabase.anon.auth.getUser(token);
      if (error || !userResponse?.user) return;
      client.data.userId = userResponse.user.id;
    } catch {
      // Invalid/expired token — leave userId unset; call:join will reject.
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const appointmentId = client.data.appointmentId as string | undefined;
    if (appointmentId) {
      client.to(`call:${appointmentId}`).emit('call:peer-left', { userId: client.data.userId });
    }
  }

  /** Joins the caller to the room for one appointment, after confirming they
   * are actually the patient or doctor on it (same check as
   * TelemedicineService.guardAppointmentAccess) and that it's a video
   * consult. Tells the newcomer whether a peer is already waiting so the
   * frontend knows which side should create the SDP offer. */
  @SubscribeMessage('call:join')
  async handleJoin(@MessageBody() body: { appointmentId: string }, @ConnectedSocket() client: Socket) {
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
      .single();

    if (!appointment || (appointment.patient_id !== userId && appointment.doctor_id !== userId)) {
      client.emit('call:error', { message: 'Not authorized for this appointment' });
      return;
    }
    if (appointment.type !== AppointmentType.VIDEO) {
      client.emit('call:error', { message: 'This appointment is not a video consultation' });
      return;
    }
    if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.DONE) {
      client.emit('call:error', { message: 'This consultation has already ended' });
      return;
    }

    const room = `call:${appointmentId}`;
    client.data.appointmentId = appointmentId;
    client.join(room);

    const roomSockets = await this.server.in(room).fetchSockets();
    const peerAlreadyPresent = roomSockets.some((s) => s.id !== client.id);

    client.emit('call:room-info', { peerPresent: peerAlreadyPresent });
    client.to(room).emit('call:peer-joined', { userId });
  }

  @SubscribeMessage('call:offer')
  handleOffer(@MessageBody() body: { appointmentId: string; sdp: unknown }, @ConnectedSocket() client: Socket) {
    client.to(`call:${body.appointmentId}`).emit('call:offer', { sdp: body.sdp, from: client.data.userId });
  }

  @SubscribeMessage('call:answer')
  handleAnswer(@MessageBody() body: { appointmentId: string; sdp: unknown }, @ConnectedSocket() client: Socket) {
    client.to(`call:${body.appointmentId}`).emit('call:answer', { sdp: body.sdp, from: client.data.userId });
  }

  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(@MessageBody() body: { appointmentId: string; candidate: unknown }, @ConnectedSocket() client: Socket) {
    client.to(`call:${body.appointmentId}`).emit('call:ice-candidate', { candidate: body.candidate });
  }

  /** Lets a peer announce it muted/unmuted or turned its camera on/off,
   * so the other side can show an accurate "peer is muted" indicator
   * without that state ever needing to touch the media stream itself. */
  @SubscribeMessage('call:media-state')
  handleMediaState(
    @MessageBody() body: { appointmentId: string; muted?: boolean; videoOff?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`call:${body.appointmentId}`).emit('call:peer-media-state', { muted: body.muted, videoOff: body.videoOff });
  }

  @SubscribeMessage('call:leave')
  handleLeave(@MessageBody() body: { appointmentId: string }, @ConnectedSocket() client: Socket) {
    const room = `call:${body.appointmentId}`;
    client.to(room).emit('call:peer-left', { userId: client.data.userId });
    client.leave(room);
    client.data.appointmentId = undefined;
  }
}
