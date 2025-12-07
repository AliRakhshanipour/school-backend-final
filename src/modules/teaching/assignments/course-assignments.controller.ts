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
import { CourseAssignmentsService } from './course-assignments.service';
import { CreateCourseAssignmentDto } from './dto/create-course-assignment.dto';
import { UpdateCourseAssignmentDto } from './dto/update-course-assignment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-course-assignments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/teaching/course-assignments')
export class CourseAssignmentsController {
  constructor(
    private readonly courseAssignmentsService: CourseAssignmentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'ایجاد انتساب درس به کلاس و معلم‌ها',
  })
  create(@Body() dto: CreateCourseAssignmentDto) {
    return this.courseAssignmentsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'لیست انتساب‌ها بر اساس کلاس. اگر classGroupId داده نشود، مقداردهی نمی‌شود (اختیاری)',
  })
  @ApiQuery({
    name: 'classGroupId',
    required: false,
    description: 'آیدی کلاس',
  })
  findAll(@Query('classGroupId') classGroupIdRaw?: string) {
    if (classGroupIdRaw) {
      const id = parseInt(classGroupIdRaw, 10);
      if (!Number.isNaN(id)) {
        return this.courseAssignmentsService.findAllByClass(id);
      }
    }
    // اگر هیچ پارامتری نباشد، همه انتساب‌ها را برای همه کلاس‌ها بدهیم
    // (برای سادگی اینجا می‌توانیم متد جدا ننویسیم و از findMany مستقیم استفاده کنیم)
    return this.courseAssignmentsService['prisma'].courseAssignment.findMany({
      include: {
        academicYear: true,
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
        course: true,
        mainTeacher: { include: { user: true } },
        assistantTeacher: { include: { user: true } },
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک انتساب درس-کلاس' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courseAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش انتساب درس-کلاس' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseAssignmentDto,
  ) {
    return this.courseAssignmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'حذف انتساب درس-کلاس (در صورتی که برنامه هفتگی براش تعریف نشده باشد)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseAssignmentsService.remove(id);
  }
}
