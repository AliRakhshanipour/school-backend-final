import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PublicPageService } from './public-page.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-public-page')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/public-sections')
export class AdminPublicPageController {
  constructor(private readonly publicPageService: PublicPageService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد بخش جدید در صفحه عمومی مدرسه' })
  create(@Body() dto: CreateSectionDto) {
    return this.publicPageService.createSection(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست تمام بخش‌های صفحه عمومی' })
  list() {
    return this.publicPageService.adminListSections();
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک بخش' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.publicPageService.adminGetSection(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش یک بخش' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.publicPageService.updateSection(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف یک بخش' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.publicPageService.deleteSection(id);
  }
}
