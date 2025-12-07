// src/config/swagger.config.ts
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import basicAuth from 'express-basic-auth'; // ✅ اینجا اصلاح شد

export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
) {
  const enabled = configService.get<boolean>('swagger.enabled');
  if (!enabled) {
    return;
  }

  const swaggerPath = configService.get<string>('swagger.path') ?? 'docs';
  const appName = configService.get<string>('app.name') ?? 'School API';

  const swaggerUser = configService.get<string>('swagger.username');
  const swaggerPass = configService.get<string>('swagger.password');

  // اگر یوزرنیم/پسورد ست شده بود، داکیومنت رو با Basic Auth قفل می‌کنیم
  if (swaggerUser && swaggerPass) {
    app.use(
      `/${swaggerPath}`,
      basicAuth({
        challenge: true,
        users: {
          [swaggerUser]: swaggerPass,
        },
      }),
    );
  }

  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('School Management API documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(swaggerPath, app, document, {
    jsonDocumentUrl: `${swaggerPath}/json`,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
