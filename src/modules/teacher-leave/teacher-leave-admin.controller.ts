import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TeacherLeaveService } from './teacher-leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LeaveStatus, UserRole } from '@prisma/client';
import { TeacherLeaveFiltersDto } from './dto/teacher-leave-filters.dto';
import { DecideTeacherLeaveRequestDto } from './dto/decide-teacher-leave-request.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('admin-teacher-leave-requests')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/teacher-leave-requests')
export class TeacherLeaveAdminController {
  constructor(private readonly teacherLeaveService: TeacherLeaveService) {}

  @Get()
  @ApiOperation({
    summary: 'لیست درخواست‌های مرخصی معلم‌ها (برای مدیر)',
  })
  @ApiQuery({ name: 'teacherId', required: false, description: 'فیلتر براساس آیدی معلم' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus, description: 'فیلتر براساس وضعیت' })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'فیلتر براساس سال تحصیلی' })
  @ApiQuery({ name: 'from', required: false, description: 'فیلتر از تاریخ (ISO)' })
  @ApiQuery({ name: 'to', required: false, description: 'فیلتر تا تاریخ (ISO)' })
  async list(
    @Query('teacherId') teacherId?: string,
    @Query('status', new ParseEnumPipe(LeaveStatus, { optional: true }))
    status?: LeaveStatus,
    @Query('academicYearId') academicYearIdRaw?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filters: TeacherLeaveFiltersDto = {
      teacherId: teacherId || undefined,
      status,
      from,
      to,
    };

    if (academicYearIdRaw) {
      const n = parseInt(academicYearIdRaw, 10);
      if (!Number.isNaN(n)) filters.academicYearId = n;
    }

    return this.teacherLeaveService.adminList(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک درخواست مرخصی معلم برای مدیر' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.teacherLeaveService.adminGetById(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'تأیید درخواست مرخصی معلم توسط مدیر/معاون' })
  async approve(
    @GetUser('userId') adminUserId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideTeacherLeaveRequestDto,
  ) {
    return this.teacherLeaveService.adminApprove(id, adminUserId, dto.decisionNote);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'رد درخواست مرخصی معلم توسط مدیر/معاون' })
  async reject(
    @GetUser('userId') adminUserId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideTeacherLeaveRequestDto,
  ) {
    return this.teacherLeaveService.adminReject(id, adminUserId, dto.decisionNote);
  }
}
