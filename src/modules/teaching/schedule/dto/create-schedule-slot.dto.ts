import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Prisma, Weekday } from '@prisma/client';

export class CreateScheduleSlotDto {
  @ApiProperty({
    example: 1,
    description: 'آیدی انتساب درس-کلاس (CourseAssignmentId)',
  })
  @IsInt()
  @Min(1)
  courseAssignmentId: number;

  @ApiProperty({
    enum: Weekday,
    example: Weekday.SATURDAY,
    description: 'روز هفته',
  })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({
    example: '08:00',
    description: 'ساعت شروع به صورت HH:MM (۲۴ ساعته)',
  })
  @IsString()
  @MaxLength(5)
  startTime: string;

  @ApiProperty({
    example: '09:30',
    description: 'ساعت پایان به صورت HH:MM (باید بعد از startTime باشد)',
  })
  @IsString()
  @MaxLength(5)
  endTime: string;

  @ApiProperty({
    example: 'کارگاه برق ۱',
    required: false,
    description: 'نام کلاس/آزمایشگاه (اختیاری)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roomLabel?: string;
}
