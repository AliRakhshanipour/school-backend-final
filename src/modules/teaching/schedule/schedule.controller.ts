import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { ScheduleService } from './schedule.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-schedule')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // ----- بخش مدیر: مدیریت برنامه هفتگی -----

  @Roles(UserRole.ADMIN)
  @Post('admin/teaching/schedule/slots')
  @ApiOperation({
    summary: 'ایجاد اسلات برنامه هفتگی برای یک انتساب درس-کلاس',
  })
  create(@Body() dto: CreateScheduleSlotDto) {
    return this.scheduleService.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/teaching/schedule/slots/:id')
  @ApiOperation({ summary: 'ویرایش اسلات برنامه هفتگی' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleSlotDto,
  ) {
    return this.scheduleService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete('admin/teaching/schedule/slots/:id')
  @ApiOperation({ summary: 'حذف اسلات برنامه هفتگی' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.remove(id);
  }

  // ----- بخش مدیر: مشاهده برنامه یک کلاس -----

  @Roles(UserRole.ADMIN)
  @Get('admin/teaching/schedule/class/:classGroupId')
  @ApiQuery({
    name: 'academicYearId',
    description: 'آیدی سال تحصیلی',
  })
  @ApiOperation({
    summary: 'برنامه هفتگی یک کلاس در یک سال تحصیلی (برای مدیر)',
  })
  getClassSchedule(
    @Param('classGroupId', ParseIntPipe) classGroupId: number,
    @Query('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.scheduleService.findByClassGroup(classGroupId, academicYearId);
  }

  // ----- بخش معلم: مشاهده برنامه هفتگی خودش -----

  @Roles(UserRole.TEACHER)
  @Get('teacher/schedule')
  @ApiQuery({
    name: 'academicYearId',
    description: 'آیدی سال تحصیلی',
  })
  @ApiOperation({
    summary: 'برنامه هفتگی معلم در سال تحصیلی مشخص',
  })
  getTeacherSchedule(
    @GetUser('userId') userId: string,
    @Query('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    // پیدا کردن TeacherId از userId در این سرویس انجام می‌شود
    return this.scheduleService.findByTeacher(userId, academicYearId);
  }
}
