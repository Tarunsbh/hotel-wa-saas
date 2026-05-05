import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, { socket: Socket; hotelId: string }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const hotelId = payload.hotelId;
      client.join(`hotel:${hotelId}`);
      this.connectedClients.set(client.id, { socket: client, hotelId });
      this.logger.log(`Client connected: ${client.id} → hotel ${hotelId}`);
    } catch (e) {
      this.logger.warn(`Unauthorized socket: ${client.id} — ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Emit new inbound message to all agents of a hotel
  emitNewMessage(hotelId: string, payload: any) {
    this.server.to(`hotel:${hotelId}`).emit('new_message', payload);
  }

  // Emit status update (sent/delivered/read/failed)
  emitStatusUpdate(hotelId: string, payload: any) {
    this.server.to(`hotel:${hotelId}`).emit('message_status', payload);
  }

  // Emit conversation update (new conv or last message changed)
  emitConversationUpdate(hotelId: string, payload: any) {
    this.server.to(`hotel:${hotelId}`).emit('conversation_update', payload);
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
    return { joined: data.conversationId };
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
  }

  // Emit to all in a specific conversation room
  emitToConversation(conversationId: string, event: string, payload: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
