import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS — allow all localhost variants + Docker nginx + configured origin
  const corsOrigin = config.get('CORS_ORIGIN') || 'http://localhost';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman / Swagger
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
      return callback(null, true); // allow all in dev — tighten in prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
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

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT') || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
