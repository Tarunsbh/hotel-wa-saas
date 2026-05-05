"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn', 'debug'],
    });
    const config = app.get(config_1.ConfigService);
    app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
    const corsOrigin = config.get('CORS_ORIGIN') || 'http://localhost';
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            const allowed = [
                'http://localhost',
                'http://localhost:80',
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:8080',
                'http://127.0.0.1:5173',
                corsOrigin,
            ];
            if (allowed.includes(origin) || origin.startsWith('http://localhost')) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    app.setGlobalPrefix('api/v1');
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Hotel WhatsApp SaaS API')
        .setDescription('Production-level WhatsApp CRM for Hotels')
        .setVersion('1.0.0')
        .addBearerAuth()
        .addTag('auth')
        .addTag('hotels')
        .addTag('guests')
        .addTag('templates')
        .addTag('campaigns')
        .addTag('conversations')
        .addTag('messages')
        .addTag('automation')
        .addTag('analytics')
        .addTag('webhook')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = config.get('PORT') || 3001;
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map