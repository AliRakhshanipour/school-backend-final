import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class CreateTeacherAttendanceDto {
  @ApiProperty({ example: '2025-12-16', description: 'فقط تاریخ (میلادی).' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.ABSENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  academicYearId?: number;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isLate?: boolean;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateMinutes?: number;

  @ApiProperty({ required: false, example: 'غیبت بدون اطلاع قبلی' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
