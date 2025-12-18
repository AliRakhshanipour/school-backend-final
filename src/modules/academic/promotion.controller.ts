import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { PromoteYearDto } from './dto/promote-year.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-academic-promotion')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/promotion')
export class PromotionController {
  constructor(private readonly academicService: AcademicService) {}

  @Post()
  @ApiOperation({
    summary:
      'ارتقای هنرجوها از یک سال تحصیلی به سال بعد بر اساس nextClassGroup',
    description:
      'اگر dryRun = true باشد، فقط شبیه‌سازی انجام می‌شود. در غیر این صورت، برای هر هنرجوی دارای nextClassGroup، یک StudentEnrollment در سال مقصد ایجاد/به‌روز می‌شود.',
  })
  promote(@Body() dto: PromoteYearDto) {
    return this.academicService.promoteYear(dto);
  }
}
