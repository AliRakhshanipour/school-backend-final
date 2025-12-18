import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, IsEnum } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class CreateCourseSessionDto {
  @ApiProperty({
    example: '2025-12-16T07:30:00.000Z',
    description: 'تاریخ/زمان جلسه (میلادی، ISO).',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false, example: 'مرور مدار ستاره-مثلث' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  topic?: string;

  @ApiProperty({ required: false, example: 12, description: 'اگر جلسه بر اساس اسلات برنامه هفتگی باشد (اختیاری)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  plannedScheduleSlotId?: number;

  @ApiProperty({
    required: false,
    example: true,
    description: 'اگر true باشد، برای تمام هنرجوهای کلاس، ردیف حضور و غیاب ساخته می‌شود (پیشنهادی)',
  })
  @IsOptional()
  @IsBoolean()
  autoFillAttendances?: boolean;

  @ApiProperty({
    required: false,
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
    description: 'وضعیت پیش‌فرض برای autoFill (معمولاً PRESENT)',
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  defaultStatus?: AttendanceStatus;
}
