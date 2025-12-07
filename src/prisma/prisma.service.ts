// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    // تنظیمات PrismaClient بر اساس env
    const logLevel = configService.get<string>('logging.level') ?? 'debug';
    const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';

    super({
      log:
        nodeEnv === 'development'
          ? [
              { emit: 'stdout', level: 'query' },
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'info' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
      errorFormat: nodeEnv === 'development' ? 'pretty' : 'minimal',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to database via Prisma');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error as Error);
      throw error;
    }
  }
}
