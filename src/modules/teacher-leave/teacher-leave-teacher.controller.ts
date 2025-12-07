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
import { TeacherLeaveService } from './teacher-leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, LeaveStatus } from '@prisma/client';
import { CreateTeacherLeaveRequestDto } from './dto/create-teacher-leave-request.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('teacher-leave-requests')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@Controller('teacher/leave-requests')
export class TeacherLeaveTeacherController {
  constructor(private readonly teacherLeaveService: TeacherLeaveService) {}

  @Post()
  @ApiOperation({
    summary: 'ثبت درخواست مرخصی توسط معلم',
    description:
      'معلم می‌تواند در بازه زمانی مشخص درخواست مرخصی ثبت کند. سیستم از تداخل با مرخصی‌های قبلی جلوگیری می‌کند.',
  })
  async create(
    @GetUser('userId') userId: string,
    @Body() dto: CreateTeacherLeaveRequestDto,
  ) {
    return this.teacherLeaveService.createForTeacher(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'لیست درخواست‌های مرخصی معلم جاری',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: LeaveStatus,
    description: 'فیلتر براساس وضعیت (اختیاری)',
  })
  async findMy(
    @GetUser('userId') userId: string,
    @Query('status', new ParseEnumPipe(LeaveStatus, { optional: true }))
    status?: LeaveStatus,
  ) {
    return this.teacherLeaveService.findMyRequests(userId, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'دریافت جزئیات یک درخواست مرخصی متعلق به معلم',
  })
  async findMyOne(
    @GetUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teacherLeaveService.findMyRequestById(userId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'لغو درخواست مرخصی در حال انتظار توسط معلم',
  })
  async cancelMy(
    @GetUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teacherLeaveService.cancelMyRequest(userId, id);
  }
}
