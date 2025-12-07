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
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('admin-academic-years')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/years')
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد سال تحصیلی جدید' })
  create(@Body() dto: CreateAcademicYearDto) {
    return this.academicYearService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست سال‌های تحصیلی' })
  findAll() {
    return this.academicYearService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک سال تحصیلی' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.academicYearService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش سال تحصیلی' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.academicYearService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف سال تحصیلی (اگر هیچ وابستگی نداشته باشد)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.academicYearService.remove(id);
  }
}
