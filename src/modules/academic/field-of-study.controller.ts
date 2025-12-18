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
import { CreateFieldOfStudyDto } from './dto/create-field-of-study.dto';
import { UpdateFieldOfStudyDto } from './dto/update-field-of-study.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-fields-of-study')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/fields')
export class FieldOfStudyController {
  constructor(private readonly academicService: AcademicService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد رشته جدید' })
  create(@Body() dto: CreateFieldOfStudyDto) {
    return this.academicService.createFieldOfStudy(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست رشته‌ها' })
  list() {
    return this.academicService.listFieldOfStudies();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش رشته' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFieldOfStudyDto,
  ) {
    return this.academicService.updateFieldOfStudy(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'حذف رشته (در صورت نداشتن کلاس/درس/پیش‌ثبت‌نام وابسته)',
  })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.deleteFieldOfStudy(id);
  }
}
