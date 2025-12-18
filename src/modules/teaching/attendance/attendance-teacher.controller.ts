import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { RecordSessionAttendancesDto } from './dto/record-session-attendances.dto';

@ApiTags('teacher-attendance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller('teacher/attendance')
export class AttendanceTeacherController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('course-assignments')
  @ApiOperation({ summary: 'لیست کلاس/درس‌های خود معلم (فقط معلم اصلی)' })
  @ApiQuery({ name: 'academicYearId', required: false })
  listMyAssignments(
    @GetUser('userId') userId: string,
    @Query('academicYearId') academicYearIdRaw?: string,
  ) {
    const academicYearId = academicYearIdRaw ? parseInt(academicYearIdRaw, 10) : undefined;
    return this.attendance.teacherListMyAssignments(userId, Number.isNaN(academicYearId) ? undefined : academicYearId);
  }

  @Post('course-assignments/:assignmentId/sessions')
  @ApiOperation({ summary: 'ایجاد جلسه جدید برای حضور و غیاب' })
  createSession(
    @GetUser('userId') userId: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: CreateCourseSessionDto,
  ) {
    return this.attendance.createSessionByTeacher(userId, assignmentId, dto);
  }

  @Get('course-assignments/:assignmentId/sessions')
  @ApiOperation({ summary: 'لیست جلسات یک درس/کلاس برای معلم' })
  listSessions(
    @GetUser('userId') userId: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.attendance.listSessionsForTeacher(userId, assignmentId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'جزئیات جلسه + حضور و غیاب هنرجوها' })
  getSessionDetails(
    @GetUser('userId') userId: string,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.attendance.getSessionDetailsForTeacher(userId, sessionId);
  }

  @Patch('sessions/:sessionId/attendances')
  @ApiOperation({ summary: 'ثبت/ویرایش حضور و غیاب جلسه توسط معلم اصلی' })
  recordAttendances(
    @GetUser('userId') userId: string,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: RecordSessionAttendancesDto,
  ) {
    return this.attendance.recordAttendancesAsTeacher(userId, sessionId, dto);
  }

  @Patch('sessions/:sessionId/lock')
  @ApiOperation({ summary: 'قفل کردن جلسه (بعد از نهایی شدن)' })
  lockSession(
    @GetUser('userId') userId: string,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.attendance.teacherLockSession(userId, sessionId);
  }
}
