// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import helmet from 'helmet';
import compression from 'compression';
import { Reflector } from '@nestjs/core';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // برای لاگ‌گیری بهتر
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);

  const port = configService.get<number>('app.port') ?? 3000;
  const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';

  // Prefix عمومی برای همه API ها
  app.setGlobalPrefix('api/v1');

  // امنیت هدرها با Helmet
  app.use(
    helmet({
      contentSecurityPolicy:
        nodeEnv === 'production'
          ? undefined
          : false /* در dev برای Swagger راحت‌تر */,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // فشرده‌سازی پاسخ‌ها
  app.use(compression());

  // CORS امن
  const allowedOrigins =
    configService.get<string[]>('security.cors.origins') ?? [];
  app.enableCors({
    origin:
      allowedOrigins.length > 0
        ? allowedOrigins
        : true /* در dev می‌تونی true بذاری */,
    credentials: true,
  });

  // ValidationPipe سراسری برای DTO ها
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // فیلدهای اضافه حذف می‌شن
      forbidNonWhitelisted: true, // اگر فیلد غیرمجاز اومد، خطا بده
      transform: true, // تبدیل خودکار string -> number, boolean, ...
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ClassSerializerInterceptor سراسری (برای مخفی کردن فیلدها مثل password)
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // Prisma graceful shutdown
  const prismaService = app.get(PrismaService);

  // Swagger (با امکان Basic Auth)
  setupSwagger(app, configService);

  await app.listen(port);
  logger.log(
    `🚀 Application is running on: http://localhost:${port}/ (env: ${nodeEnv})`,
  );
  logger.log(
    `📚 Swagger is ${
      configService.get<boolean>('swagger.enabled') ? 'ENABLED' : 'DISABLED'
    } at /${configService.get<string>('swagger.path') ?? 'docs'}`,
  );
}
bootstrap();
