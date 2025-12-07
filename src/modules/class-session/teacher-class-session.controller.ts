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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ClassSessionService } from './class-session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { RecordWorkshopScoreDto } from './dto/record-workshop-score.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('teacher-class-sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller('teacher')
export class TeacherClassSessionController {
  constructor(private readonly classSessionService: ClassSessionService) {}

  @Post('course-assignments/:assignmentId/sessions')
  @ApiOperation({
    summary: 'ثبت جلسه جدید برای یک درس/کلاس توسط معلم اصلی',
  })
  createSession(
    @GetUser('userId') userId: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: CreateSessionDto,
  ) {
    return this.classSessionService.createSessionForTeacher(
      userId,
      assignmentId,
      dto,
    );
  }

  @Get('course-assignments/:assignmentId/sessions')
  @ApiOperation({
    summary: 'لیست جلسات یک درس/کلاس برای معلم اصلی',
  })
  listSessions(
    @GetUser('userId') userId: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.classSessionService.listSessionsForTeacher(
      userId,
      assignmentId,
    );
  }

  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: 'جزئیات یک جلسه (به همراه حضور و نمرات کارگاهی) برای معلم',
  })
  getSessionDetails(
    @GetUser('userId') userId: string,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.classSessionService.getSessionDetailsForTeacher(
      userId,
      sessionId,
    );
  }

  @Patch('sessions/:sessionId/attendance')
  @ApiOperation({
    summary: 'ثبت/ویرایش حضور و غیاب هنرجوها برای یک جلسه',
  })
  recordAttendance(
    @GetUser('userId') userId: string,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.classSessionService.recordAttendanceForSession(
      userId,
      sessionId,
      dto,
    );
  }

  @Patch('sessions/:sessionId/workshop-scores')
  @ApiOperation({
    summary:
      'ثبت/ویرایش نمرات کارگاهی هنرجوها برای یک جلسه (فقط برای دروس کارگاهی)',
  })
  recordWorkshopScores(
    @GetUser('userId') userId: string,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: RecordWorkshopScoreDto,
  ) {
    return this.classSessionService.recordWorkshopScoresForSession(
      userId,
      sessionId,
      dto,
    );
  }
}
