import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
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
import { TheoryExamService } from './theory-exam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Prisma, ExamTerm, UserRole } from '@prisma/client';
import { CreateTheoryExamDto } from './dto/create-theory-exam.dto';
import { UpdateTheoryExamDto } from './dto/update-theory-exam.dto';

@ApiTags('admin-theory-exams')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/teaching/theory-exams')
export class TheoryExamAdminController {
  constructor(private readonly theoryExamService: TheoryExamService) {}

  @Post()
  @ApiOperation({
    summary: 'ایجاد امتحان تئوری جدید توسط مدیر/معاون',
    description:
      'courseAssignmentId باید از قبل ایجاد شده باشد و درس آن تئوری باشد.',
  })
  createByAdmin(
    @Body('courseAssignmentId', ParseIntPipe)
    courseAssignmentId: number,
    @Body() dto: CreateTheoryExamDto,
  ) {
    return this.theoryExamService.createExamByAdmin(
      courseAssignmentId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'لیست امتحان‌های تئوری با فیلترهای اختیاری (سال، کلاس، نوبت، انتساب)',
  })
  @ApiQuery({
    name: 'academicYearId',
    required: false,
  })
  @ApiQuery({
    name: 'classGroupId',
    required: false,
  })
  @ApiQuery({
    name: 'term',
    required: false,
    enum: ExamTerm,
  })
  @ApiQuery({
    name: 'courseAssignmentId',
    required: false,
  })
  list(
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

    return this.theoryExamService.adminListExams({
      academicYearId: Number.isNaN(academicYearId)
        ? undefined
        : academicYearId,
      classGroupId: Number.isNaN(classGroupId)
        ? undefined
        : classGroupId,
      term,
      courseAssignmentId: Number.isNaN(courseAssignmentId)
        ? undefined
        : courseAssignmentId,
    });
  }

  @Get(':examId')
  @ApiOperation({
    summary: 'جزئیات کامل یک امتحان (به همراه نمرات) برای مدیر/معاون',
  })
  getDetails(@Param('examId', ParseIntPipe) examId: number) {
    return this.theoryExamService.adminGetExamDetails(examId);
  }

  @Patch(':examId')
  @ApiOperation({
    summary: 'ویرایش اطلاعات یک امتحان توسط مدیر (زمان، عنوان، وزن، ...)',
  })
  update(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: UpdateTheoryExamDto,
  ) {
    return this.theoryExamService.updateExamByAdmin(examId, dto);
  }

  @Patch(':examId/lock')
  @ApiOperation({
    summary:
      'قفل کردن یک امتحان (بعد از نهایی شدن نمرات، دیگر قابل تغییر نیست)',
  })
  lock(@Param('examId', ParseIntPipe) examId: number) {
    return this.theoryExamService.adminLockExam(examId);
  }
}
