import {
  Controller,
  Get,
  Param,
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
import { ClassSessionService } from './class-session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-class-sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/class-sessions')
export class AdminClassSessionController {
  constructor(private readonly classSessionService: ClassSessionService) {}

  @Get()
  @ApiOperation({
    summary: 'لیست جلسات یک کلاس در یک سال تحصیلی (برای مدیر)',
  })
  @ApiQuery({ name: 'classGroupId', required: true })
  @ApiQuery({ name: 'academicYearId', required: true })
  listByClass(
    @Query('classGroupId', ParseIntPipe) classGroupId: number,
    @Query('academicYearId', ParseIntPipe) academicYearId: number,
  ) {
    return this.classSessionService.adminListSessionsByClass(
      classGroupId,
      academicYearId,
    );
  }

  @Get(':sessionId')
  @ApiOperation({
    summary: 'جزئیات کامل یک جلسه (حضور، نمرات کارگاهی) برای مدیر',
  })
  getDetails(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.classSessionService.adminGetSessionDetails(sessionId);
  }

  @Patch(':sessionId/lock')
  @ApiOperation({
    summary:
      'قفل کردن جلسه (بعد از نهایی شدن حضور و نمرات؛ دیگر قابل ویرایش نیست)',
  })
  lock(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.classSessionService.adminLockSession(sessionId);
  }
}
