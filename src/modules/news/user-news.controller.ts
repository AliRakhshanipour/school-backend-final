// src/modules/news/user-news.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('user-news')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
@Controller('user/news')
export class UserNewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({
    summary:
      'فید خبر برای کاربر لاگین‌شده (بر اساس نقش و سطح دسترسی)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'حداکثر تعداد خبر (پیش‌فرض ۲۰)',
  })
  list(
    @GetUser('role') role: UserRole,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 20;
    return this.newsService.userFeed(
      role,
      Number.isNaN(limit) ? 20 : limit,
    );
  }
}
