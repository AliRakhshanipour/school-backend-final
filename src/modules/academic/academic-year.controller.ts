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
import { AcademicService } from './academic.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-academic-years')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/years')
export class AcademicYearController {
  constructor(private readonly academicService: AcademicService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد سال تحصیلی جدید' })
  create(@Body() dto: CreateAcademicYearDto) {
    return this.academicService.createAcademicYear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست سال‌های تحصیلی' })
  list() {
    return this.academicService.listAcademicYears();
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک سال تحصیلی' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.getAcademicYear(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش سال تحصیلی' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.academicService.updateAcademicYear(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'حذف سال تحصیلی (در صورت نداشتن داده وابسته)',
  })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.deleteAcademicYear(id);
  }
}
