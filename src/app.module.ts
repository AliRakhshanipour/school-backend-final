// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import {
  ThrottlerModule,
  ThrottlerModuleOptions,
  ThrottlerGuard,
} from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesGuard } from './common/guards/roles.guard';
import { PreRegistrationModule } from './modules/preregistration/preregistration.module';

import { TeacherLeaveModule } from './modules/teacher-leave/teacher-leave.module';
import { TeachingModule } from './modules/teaching/teaching.module';
import { ClassSessionModule } from './modules/class-session/class-session.module';
import { TheoryExamModule } from './modules/theory-exam/theory-exam.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StudentModule } from './modules/student/student.module';
import { AcademicModule } from './modules/academic/academic.module';
import { NewsModule } from './modules/news/news.module';
import { PublicPageModule } from './modules/public-page/public-page.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    PrismaModule,

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => {
        const ttl =
          configService.get<number>('security.rateLimit.ttl') ?? 60;
        const limit =
          configService.get<number>('security.rateLimit.limit') ?? 100;

        return {
          throttlers: [{ ttl, limit }],
        };
      },
    }),

    AuthModule,
    UsersModule,
    PreRegistrationModule,
    AcademicModule,
    TeacherLeaveModule,
    TeachingModule,
    ClassSessionModule,
    TheoryExamModule,
    ReportsModule,
    StudentModule,
    NewsModule,
    PublicPageModule
  ],
  providers: [
    // Rate limiting گلوبال
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
