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
import { AcademicService } from './academic.service';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-class-groups')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/class-groups')
export class ClassGroupController {
  constructor(private readonly academicService: AcademicService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد کلاس جدید' })
  create(@Body() dto: CreateClassGroupDto) {
    return this.academicService.createClassGroup(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'لیست کلاس‌ها با فیلتر اختیاری سال تحصیلی / رشته / پایه',
  })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'fieldOfStudyId', required: false })
  @ApiQuery({ name: 'gradeLevelId', required: false })
  list(
    @Query('academicYearId') academicYearIdRaw?: string,
    @Query('fieldOfStudyId') fieldOfStudyIdRaw?: string,
    @Query('gradeLevelId') gradeLevelIdRaw?: string,
  ) {
    const academicYearId = academicYearIdRaw
      ? parseInt(academicYearIdRaw, 10)
      : undefined;
    const fieldOfStudyId = fieldOfStudyIdRaw
      ? parseInt(fieldOfStudyIdRaw, 10)
      : undefined;
    const gradeLevelId = gradeLevelIdRaw
      ? parseInt(gradeLevelIdRaw, 10)
      : undefined;

    return this.academicService.listClassGroups({
      academicYearId:
        academicYearId && !Number.isNaN(academicYearId)
          ? academicYearId
          : undefined,
      fieldOfStudyId:
        fieldOfStudyId && !Number.isNaN(fieldOfStudyId)
          ? fieldOfStudyId
          : undefined,
      gradeLevelId:
        gradeLevelId && !Number.isNaN(gradeLevelId)
          ? gradeLevelId
          : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک کلاس' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.getClassGroup(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش اطلاعات کلاس' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassGroupDto,
  ) {
    return this.academicService.updateClassGroup(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'حذف کلاس (در صورت نداشتن داده آموزشی/ثبت‌نامی وابسته)',
  })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.deleteClassGroup(id);
  }
}
