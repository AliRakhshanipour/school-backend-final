import { Body, Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';
import { RecordSessionAttendancesDto } from './dto/record-session-attendances.dto';

@ApiTags('admin-attendance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/attendance')
export class AttendanceAdminController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'لیست جلسات با فیلترهای اختیاری' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classGroupId', required: false })
  @ApiQuery({ name: 'courseAssignmentId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date-time' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date-time' })
  listSessions(
    @Query('academicYearId') academicYearIdRaw?: string,
    @Query('classGroupId') classGroupIdRaw?: string,
    @Query('courseAssignmentId') courseAssignmentIdRaw?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const academicYearId = academicYearIdRaw ? parseInt(academicYearIdRaw, 10) : undefined;
    const classGroupId = classGroupIdRaw ? parseInt(classGroupIdRaw, 10) : undefined;
    const courseAssignmentId = courseAssignmentIdRaw ? parseInt(courseAssignmentIdRaw, 10) : undefined;

    return this.attendance.adminListSessions({
      academicYearId: Number.isNaN(academicYearId) ? undefined : academicYearId,
      classGroupId: Number.isNaN(classGroupId) ? undefined : classGroupId,
      courseAssignmentId: Number.isNaN(courseAssignmentId) ? undefined : courseAssignmentId,
      from,
      to,
    });
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'جزئیات جلسه + حضور و غیاب هنرجوها (مدیر)' })
  getSessionDetails(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.attendance.adminGetSessionDetails(sessionId);
  }

  @Post('course-assignments/:assignmentId/sessions')
  @ApiOperation({ summary: 'ایجاد جلسه توسط مدیر' })
  createSession(
    @GetUser('userId') adminUserId: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: CreateCourseSessionDto,
  ) {
    return this.attendance.createSessionByAdmin(adminUserId, assignmentId, dto);
  }

  @Patch('sessions/:sessionId')
  @ApiOperation({ summary: 'ویرایش جلسه توسط مدیر (اگر قفل نباشد)' })
  updateSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: UpdateCourseSessionDto,
  ) {
    return this.attendance.adminUpdateSession(sessionId, dto);
  }

  @Patch('sessions/:sessionId/lock')
  @ApiOperation({ summary: 'قفل/باز کردن جلسه توسط مدیر' })
  setLock(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Query('isLocked', ParseBoolPipe) isLocked: boolean,
  ) {
    return this.attendance.adminSetLock(sessionId, isLocked);
  }

  @Patch('sessions/:sessionId/attendances')
  @ApiOperation({ summary: 'ثبت/ویرایش حضور و غیاب جلسه توسط مدیر (اگر قفل نباشد)' })
  recordAttendances(
    @GetUser('userId') adminUserId: string,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: RecordSessionAttendancesDto,
  ) {
    return this.attendance.recordAttendancesAsAdmin(adminUserId, sessionId, dto);
  }
}
