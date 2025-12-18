// src/modules/news/admin-news.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { NewsVisibility, UserRole } from '@prisma/client';

@ApiTags('admin-news')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد خبر جدید' })
  create(
    @GetUser('userId') userId: string,
    @Body() dto: CreateNewsDto,
  ) {
    return this.newsService.createNews(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'لیست خبرها برای پنل مدیریت (بدون محدودیت انتشار)',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'visibility', required: false, enum: NewsVisibility })
  @ApiQuery({ name: 'isPublished', required: false })
  list(
    @Query('search') search?: string,
    @Query('visibility') visibility?: NewsVisibility,
    @Query('isPublished') isPublishedRaw?: string,
  ) {
    let isPublished: boolean | undefined;
    if (isPublishedRaw === 'true') isPublished = true;
    if (isPublishedRaw === 'false') isPublished = false;

    return this.newsService.adminList({
      search,
      visibility,
      isPublished,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک خبر (مدیریت)' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.adminGet(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش خبر' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
  ) {
    return this.newsService.updateNews(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف خبر' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.deleteNews(id);
  }
}
