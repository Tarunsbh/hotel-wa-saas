"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let statusCode;
        let message;
        let error;
        if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
                error = exception.message;
            }
            else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const res = exceptionResponse;
                message = res.message || exception.message;
                error = res.error || this.getHttpErrorMessage(statusCode);
            }
            else {
                message = exception.message;
                error = this.getHttpErrorMessage(statusCode);
            }
        }
        else if (exception instanceof Error) {
            statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'Internal Server Error';
            this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
        }
        else {
            statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected error occurred';
            error = 'Internal Server Error';
            this.logger.error('Unknown exception type', JSON.stringify(exception));
        }
        const errorBody = {
            statusCode,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        if (statusCode >= 500) {
            this.logger.error(`${request.method} ${request.url} → ${statusCode}`, exception instanceof Error ? exception.stack : JSON.stringify(exception));
        }
        else if (statusCode >= 400) {
            this.logger.warn(`${request.method} ${request.url} → ${statusCode}: ${JSON.stringify(message)}`);
        }
        response.status(statusCode).json(errorBody);
    }
    getHttpErrorMessage(statusCode) {
        const messages = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            409: 'Conflict',
            410: 'Gone',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        };
        return messages[statusCode] || 'Unknown Error';
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map