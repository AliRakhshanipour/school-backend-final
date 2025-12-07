
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
import { ClassGroupService } from './class-group.service';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('admin-class-groups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/class-groups')
export class ClassGroupController {
  constructor(private readonly classGroupService: ClassGroupService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد کلاس جدید' })
  create(@Body() dto: CreateClassGroupDto) {
    return this.classGroupService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'لیست کلاس‌ها. اگر academicYearId داده شود، فقط کلاس‌های آن سال برگردانده می‌شود.',
  })
  @ApiQuery({
    name: 'academicYearId',
    required: false,
    description: 'فیلتر براساس سال تحصیلی',
  })
  findAll(@Query('academicYearId') academicYearId?: string) {
    if (academicYearId) {
      const idNum = parseInt(academicYearId, 10);
      if (!Number.isNaN(idNum)) {
        return this.classGroupService.findByYear(idNum);
      }
    }
    return this.classGroupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک کلاس' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classGroupService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش کلاس' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassGroupDto,
  ) {
    return this.classGroupService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'حذف کلاس (فقط اگر هنرجویی در آن ثبت‌نام نشده باشد)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classGroupService.remove(id);
  }
}
