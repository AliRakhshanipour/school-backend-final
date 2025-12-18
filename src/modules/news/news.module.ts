// src/modules/news/news.module.ts
import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { AdminNewsController } from './admin-news.controller';
import { PublicNewsController } from './public-news.controller';
import { UserNewsController } from './user-news.controller';

@Module({
  providers: [NewsService],
  controllers: [
    AdminNewsController,
    PublicNewsController,
    UserNewsController,
  ],
  exports: [NewsService],
})
export class NewsModule {}
