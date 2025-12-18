import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CreateTeacherAttendanceDto } from './dto/create-teacher-attendance.dto';
import { UpdateTeacherAttendanceDto } from './dto/update-teacher-attendance.dto';

@ApiTags('admin-teacher-attendance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/attendance/teachers')
export class TeacherAttendanceAdminController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post(':teacherId')
  @ApiOperation({ summary: 'ثبت/ویرایش حضور و غیاب یک معلم در یک تاریخ (Upsert)' })
  upsert(
    @GetUser('userId') adminUserId: string,
    @Param('teacherId') teacherId: string,
    @Body() dto: CreateTeacherAttendanceDto,
  ) {
    return this.attendance.adminUpsertTeacherAttendance(adminUserId, teacherId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست حضور و غیاب معلم‌ها با فیلتر' })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  list(
    @Query('teacherId') teacherId?: string,
    @Query('academicYearId') academicYearIdRaw?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const academicYearId = academicYearIdRaw ? parseInt(academicYearIdRaw, 10) : undefined;

    return this.attendance.adminListTeacherAttendance({
      teacherId,
      academicYearId: Number.isNaN(academicYearId) ? undefined : academicYearId,
      from,
      to,
    });
  }

  @Patch('records/:id')
  @ApiOperation({ summary: 'ویرایش رکورد حضور و غیاب معلم' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherAttendanceDto,
  ) {
    return this.attendance.adminUpdateTeacherAttendance(id, dto);
  }

  @Delete('records/:id')
  @ApiOperation({ summary: 'حذف رکورد حضور و غیاب معلم' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attendance.adminDeleteTeacherAttendance(id);
  }
}
