"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(EventsGateway_1.name);
        this.connectedClients = new Map();
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
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
        }
        catch (e) {
            this.logger.warn(`Unauthorized socket: ${client.id} — ${e.message}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.connectedClients.delete(client.id);
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    emitNewMessage(hotelId, payload) {
        this.server.to(`hotel:${hotelId}`).emit('new_message', payload);
    }
    emitStatusUpdate(hotelId, payload) {
        this.server.to(`hotel:${hotelId}`).emit('message_status', payload);
    }
    emitConversationUpdate(hotelId, payload) {
        this.server.to(`hotel:${hotelId}`).emit('conversation_update', payload);
    }
    handleJoinConversation(client, data) {
        client.join(`conversation:${data.conversationId}`);
        return { joined: data.conversationId };
    }
    handleLeaveConversation(client, data) {
        client.leave(`conversation:${data.conversationId}`);
    }
    emitToConversation(conversationId, event, payload) {
        this.server.to(`conversation:${conversationId}`).emit(event, payload);
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleLeaveConversation", null);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/',
        transports: ['websocket', 'polling'],
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map