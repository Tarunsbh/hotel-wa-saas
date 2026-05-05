"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
let LoggingInterceptor = class LoggingInterceptor {
    constructor() {
        this.logger = new common_1.Logger('HTTP');
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const { method, url, ip } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();
        const userId = request.user?.userId;
        const hotelId = request.user?.hotelId;
        this.logger.log(`→ ${method} ${url} [${ip}] ${userAgent}${userId ? ` user=${userId}` : ''}`);
        return next.handle().pipe((0, operators_1.tap)(() => {
            const statusCode = response.statusCode;
            const durationMs = Date.now() - startTime;
            this.logger.log(`← ${method} ${url} ${statusCode} ${durationMs}ms${hotelId ? ` hotel=${hotelId}` : ''}`);
        }), (0, operators_1.catchError)((error) => {
            const durationMs = Date.now() - startTime;
            const statusCode = error.status || error.statusCode || 500;
            this.logger.warn(`← ${method} ${url} ${statusCode} ${durationMs}ms [ERROR: ${error.message}]`);
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map