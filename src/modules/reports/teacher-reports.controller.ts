import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('teacher-reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller('teacher/reports')
export class TeacherReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('course-assignments/:courseAssignmentId')
  @ApiOperation({
    summary:
      'گزارش کامل یک درس/کلاس برای معلم (نمرات، حضور، میانگین کلاس)',
  })
  getCourseAssignmentReport(
    @GetUser('userId') userId: string,
    @Param('courseAssignmentId', ParseIntPipe)
    courseAssignmentId: number,
  ) {
    return this.reportsService.getTeacherCourseAssignmentReport(
      userId,
      courseAssignmentId,
    );
  }
}
