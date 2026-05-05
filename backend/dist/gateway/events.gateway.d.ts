import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private configService;
    server: Server;
    private readonly logger;
    private connectedClients;
    constructor(jwtService: JwtService, configService: ConfigService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    emitNewMessage(hotelId: string, payload: any): void;
    emitStatusUpdate(hotelId: string, payload: any): void;
    emitConversationUpdate(hotelId: string, payload: any): void;
    handleJoinConversation(client: Socket, data: {
        conversationId: string;
    }): {
        joined: string;
    };
    handleLeaveConversation(client: Socket, data: {
        conversationId: string;
    }): void;
    emitToConversation(conversationId: string, event: string, payload: any): void;
}
