import {
  BadRequestException,
  Controller,
  Get,
  Param,
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
import { ExamTerm, UserRole } from '@prisma/client';

@ApiTags('admin-reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('students/:studentId/academic-years/:academicYearId')
  @ApiOperation({ summary: 'گزارش کامل سال تحصیلی یک هنرجو (برای مدیر/معاون)' })
  getStudentYearReport(
    @Param('studentId') studentId: string,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.reportsService.getStudentYearReport(studentId, academicYearId);
  }

  @Get('class-groups/:classGroupId/academic-years/:academicYearId')
  @ApiOperation({ summary: 'گزارش کامل سال تحصیلی یک کلاس (برای مدیر/معاون)' })
  getClassYearReport(
    @Param('classGroupId', ParseIntPipe) classGroupId: number,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.reportsService.getClassYearReport(classGroupId, academicYearId);
  }

  @Get('theory-exams')
  @ApiOperation({
    summary: 'لیست کلی امتحان‌های تئوری با فیلترهای اختیاری (برای گزارش‌های مدیریتی)',
  })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classGroupId', required: false })
  @ApiQuery({ name: 'term', required: false, enum: ExamTerm })
  @ApiQuery({ name: 'courseAssignmentId', required: false })
  listTheoryExams(
    @Query('academicYearId') academicYearIdRaw?: string,
    @Query('classGroupId') classGroupIdRaw?: string,
    @Query('term') termRaw?: string,
    @Query('courseAssignmentId') courseAssignmentIdRaw?: string,
  ) {
    const academicYearId = this.parseOptionalPositiveInt('academicYearId', academicYearIdRaw);
    const classGroupId = this.parseOptionalPositiveInt('classGroupId', classGroupIdRaw);
    const courseAssignmentId = this.parseOptionalPositiveInt('courseAssignmentId', courseAssignmentIdRaw);
    const term = this.parseOptionalExamTerm(termRaw);

    return this.reportsService.listTheoryExams({
      academicYearId,
      classGroupId,
      courseAssignmentId,
      term,
    });
  }

  private parseOptionalPositiveInt(name: string, raw?: string): number | undefined {
    if (raw == null || raw === '') return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      throw new BadRequestException(`${name} نامعتبر است`);
    }
    return n;
  }

  private parseOptionalExamTerm(raw?: string): ExamTerm | undefined {
    if (raw == null || raw === '') return undefined;
    const values = Object.values(ExamTerm) as string[];
    if (!values.includes(raw)) {
      throw new BadRequestException('term نامعتبر است');
    }
    return raw as ExamTerm;
  }
}
