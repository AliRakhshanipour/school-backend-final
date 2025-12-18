import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TheoryExamService } from './theory-exam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateTheoryExamDto } from './dto/create-theory-exam.dto';
import { RecordTheoryExamResultsDto } from './dto/record-theory-exam-results.dto';

@ApiTags('teacher-theory-exams')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller('teacher')
export class TheoryExamTeacherController {
  constructor(private readonly theoryExamService: TheoryExamService) {}

  @Post('course-assignments/:assignmentId/theory-exams')
  @ApiOperation({ summary: 'ثبت امتحان جدید برای یک درس/کلاس توسط معلم اصلی' })
  createExam(
    @GetUser('userId') userId: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: CreateTheoryExamDto,
  ) {
    return this.theoryExamService.createExamByTeacher(userId, assignmentId, dto);
  }

  @Get('course-assignments/:assignmentId/theory-exams')
  @ApiOperation({ summary: 'لیست امتحان‌های یک درس/کلاس برای معلم اصلی' })
  listExams(
    @GetUser('userId') userId: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.theoryExamService.listExamsForTeacher(userId, assignmentId);
  }

  @Get('theory-exams/:examId')
  @ApiOperation({ summary: 'جزئیات یک امتحان تئوری (به همراه نمرات) برای معلم' })
  getExamDetails(
    @GetUser('userId') userId: string,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.theoryExamService.getExamDetailsForTeacher(userId, examId);
  }

  @Patch('theory-exams/:examId/results')
  @ApiOperation({ summary: 'ثبت/ویرایش نمرات هنرجوها برای یک امتحان توسط معلم اصلی' })
  recordResults(
    @GetUser('userId') userId: string,
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: RecordTheoryExamResultsDto,
  ) {
    return this.theoryExamService.recordResultsForTeacher(userId, examId, dto);
  }
}
