// src/modules/news/public-news.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NewsService } from './news.service';

@ApiTags('public-news')
@Controller('public/news')
export class PublicNewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({
    summary: 'لیست خبرهای منتشر شده عمومی (برای صفحه عمومی سایت)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'حداکثر تعداد خبر (پیش‌فرض ۱۰)',
  })
  list(@Query('limit') limitRaw?: string) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 10;
    return this.newsService.publicList(
      Number.isNaN(limit) ? 10 : limit,
    );
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'دریافت یک خبر عمومی بر اساس اسلاگ',
  })
  get(@Param('slug') slug: string) {
    return this.newsService.publicGetBySlug(slug);
  }
}
