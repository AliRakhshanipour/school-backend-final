import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class SessionAttendanceItemDto {
  @ApiProperty({ example: 'student-uuid' })
  @IsString()
  @MaxLength(100)
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.ABSENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isLate?: boolean;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateMinutes?: number;

  @ApiProperty({ required: false, example: 'غیبت موجه با نامه' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class RecordSessionAttendancesDto {
  @ApiProperty({ type: [SessionAttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionAttendanceItemDto)
  items: SessionAttendanceItemDto[];
}
