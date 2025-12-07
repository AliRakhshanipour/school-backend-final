import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma, AttendanceStatus } from '@prisma/client';

export class AttendanceItemDto {
  @ApiProperty({
    example: 'student-uuid',
    description: 'شناسه هنرجو (StudentId)',
  })
  @IsString()
  @MaxLength(100)
  studentId: string;

  @ApiProperty({
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
    description: 'وضعیت حضور هنرجو',
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({
    required: false,
    example: true,
    description: 'آیا هنرجو با تأخیر حاضر شده است؟',
  })
  @IsOptional()
  @IsBoolean()
  isLate?: boolean;

  @ApiProperty({
    required: false,
    example: 10,
    description: 'تعداد دقیقه تأخیر (اگر isLate=true)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  lateMinutes?: number;

  @ApiProperty({
    required: false,
    example: 'تأخیر به علت ترافیک شدید',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class RecordAttendanceDto {
  @ApiProperty({
    type: [AttendanceItemDto],
    description:
      'لیست حضور و غیاب هنرجوها. فرانت بهتره برای همه‌ی هنرجوهای کلاس این لیست رو بفرسته.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  items: AttendanceItemDto[];
}
