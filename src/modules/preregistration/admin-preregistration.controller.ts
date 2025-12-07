import {
  Body,
  Controller,
  Delete,
  Param,
  ParseEnumPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { PreRegistrationService } from './preregistration.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, PreRegistrationStatus } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';

class UpdateStatusDto {
  status: PreRegistrationStatus;
  admittedFieldOfStudyId?: number;
  assignedClassGroupId?: number;
}

@ApiTags('admin-preregistration')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/preregistration')
export class AdminPreRegistrationController {
  constructor(
    private readonly preRegistrationService: PreRegistrationService,
  ) {}

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'تغییر وضعیت پیش‌ثبت‌نام (قبول / رد / رزرو) توسط مدیر/معاون. در صورت قبولی، تعیین رشته و کلاس الزامی است.',
  })
  @ApiParam({ name: 'id', description: 'شناسه پیش‌ثبت‌نام' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(PreRegistrationStatus))
    status: PreRegistrationStatus,
    @Body('admittedFieldOfStudyId') admittedFieldOfStudyId?: number,
    @Body('assignedClassGroupId') assignedClassGroupId?: number,
  ) {
    return this.preRegistrationService.adminUpdateStatus(
      id,
      status,
      admittedFieldOfStudyId,
      assignedClassGroupId,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'حذف کامل پیش‌ثبت‌نام (برای ردشده‌ها). عکس از روی سرور نیز حذف می‌شود.',
  })
  @ApiParam({ name: 'id', description: 'شناسه پیش‌ثبت‌نام' })
  async delete(@Param('id') id: string) {
    return this.preRegistrationService.adminDelete(id);
  }
}
