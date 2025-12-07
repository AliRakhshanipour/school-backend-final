import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class TeacherLeaveFiltersDto {
  @ApiPropertyOptional({
    description: 'فیلتر بر اساس آیدی معلم (TeacherId)',
  })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({
    enum: LeaveStatus,
    description: 'فیلتر بر اساس وضعیت مرخصی',
  })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiPropertyOptional({
    description: 'فیلتر بر اساس سال تحصیلی (AcademicYearId)',
    example: 1,
  })
  @IsOptional()
  academicYearId?: number;

  @ApiPropertyOptional({
    example: '2025-12-01T00:00:00.000Z',
    description: 'فیلتر از تاریخ (start)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'فیلتر تا تاریخ (end)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
