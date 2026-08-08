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
import { AiService } from '@/modules/ai/services/ai.service';
import { UseGuards } from '@nestjs/common';
// We might not use SupabaseAuthGuard if we want public access for landing page.
// We can handle auth manually in the connection or specific events.

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly aiService: AiService) { }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat_message')
  async handleMessage(
    @MessageBody() data: { message: string; context: 'doctor' | 'patient' | 'landing' },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { message, context } = data;

      // Dispatch to the correct agent based on context
      const reply = await this.aiService.processQuery(message, context);

      // Send the reply back to this specific client
      client.emit('chat_reply', { status: 'success', data: reply });
    } catch (error) {
      client.emit('chat_reply', { status: 'error', message: error.message });
    }
  }
}
