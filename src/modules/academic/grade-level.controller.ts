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
import { AcademicService } from './academic.service';
import { CreateGradeLevelDto } from './dto/create-grade-level.dto';
import { UpdateGradeLevelDto } from './dto/update-grade-level.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin-grade-levels')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/academic/grade-levels')
export class GradeLevelController {
  constructor(private readonly academicService: AcademicService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد پایه جدید' })
  create(@Body() dto: CreateGradeLevelDto) {
    return this.academicService.createGradeLevel(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست پایه‌ها' })
  list() {
    return this.academicService.listGradeLevels();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش پایه' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGradeLevelDto,
  ) {
    return this.academicService.updateGradeLevel(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'حذف پایه (در صورت نداشتن کلاس/درس وابسته)',
  })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.deleteGradeLevel(id);
  }
}
