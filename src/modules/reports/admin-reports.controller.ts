import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Prisma, ExamTerm, UserRole } from '@prisma/client';

@ApiTags('admin-reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('students/:studentId/academic-years/:academicYearId')
  @ApiOperation({
    summary: 'گزارش کامل سال تحصیلی یک هنرجو (برای مدیر/معاون)',
  })
  getStudentYearReport(
    @Param('studentId') studentId: string,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.reportsService.getStudentYearReport(
      studentId,
      academicYearId,
    );
  }

  @Get('class-groups/:classGroupId/academic-years/:academicYearId')
  @ApiOperation({
    summary: 'گزارش کامل سال تحصیلی یک کلاس (برای مدیر/معاون)',
  })
  getClassYearReport(
    @Param('classGroupId', ParseIntPipe) classGroupId: number,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.reportsService.getClassYearReport(
      classGroupId,
      academicYearId,
    );
  }

  @Get('theory-exams')
  @ApiOperation({
    summary:
      'لیست کلی امتحان‌های تئوری با فیلترهای اختیاری (برای گزارش‌های مدیریتی)',
  })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classGroupId', required: false })
  @ApiQuery({
    name: 'term',
    required: false,
    enum: ExamTerm,
  })
  @ApiQuery({ name: 'courseAssignmentId', required: false })
  listTheoryExams(
    @Query('academicYearId') academicYearIdRaw?: string,
    @Query('classGroupId') classGroupIdRaw?: string,
    @Query('term', new ParseEnumPipe(ExamTerm, { optional: true }))
    term?: ExamTerm,
    @Query('courseAssignmentId') courseAssignmentIdRaw?: string,
  ) {
    const academicYearId = academicYearIdRaw
      ? parseInt(academicYearIdRaw, 10)
      : undefined;
    const classGroupId = classGroupIdRaw
      ? parseInt(classGroupIdRaw, 10)
      : undefined;
    const courseAssignmentId = courseAssignmentIdRaw
      ? parseInt(courseAssignmentIdRaw, 10)
      : undefined;

    // از سرویس TheoryExamService هم میشه استفاده کرد، اما اگر فقط ReportsService باشه، این رو حذف کن
    return {
      message:
        'برای لیست کامل امتحانات قبلاً ماژول TheoryExam ساخته شده است؛ این endpoint را می‌توان بعداً به آن سرویس متصل کرد.',
    };
  }
}
