import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('student-reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('student/reports')
export class StudentReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('academic-years/:academicYearId')
  @ApiOperation({ summary: 'گزارش کامل سال تحصیلی برای هنرجو (خودش)' })
  getMyYearReport(
    @GetUser('userId') userId: string,
    @Param('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.reportsService.getStudentYearReportByUser(userId, academicYearId);
  }
}
