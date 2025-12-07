import {
  Body,
  Controller,
  Delete,
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
import { FieldOfStudyService } from './field-of-study.service';
import { CreateFieldOfStudyDto } from './dto/create-field-of-study.dto';
import { UpdateFieldOfStudyDto } from './dto/update-field-of-study.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('admin-fields-of-study')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/fields-of-study')
export class FieldOfStudyController {
  constructor(
    private readonly fieldOfStudyService: FieldOfStudyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد رشته تحصیلی جدید' })
  create(@Body() dto: CreateFieldOfStudyDto) {
    return this.fieldOfStudyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست همه رشته‌ها (برای مدیر)' })
  findAll() {
    return this.fieldOfStudyService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک رشته' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fieldOfStudyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش رشته تحصیلی' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFieldOfStudyDto,
  ) {
    return this.fieldOfStudyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'حذف رشته (در صورتی که هیچ کلاسی نداشته باشد)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fieldOfStudyService.remove(id);
  }
}
