import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    example: '2025-12-10T08:00:00.000Z',
    description:
      'تاریخ و زمان جلسه به صورت ISO (میلادی). فرانت از شمسی به میلادی تبدیل می‌کند.',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    required: false,
    example: 'مدار سری و موازی',
    description: 'موضوع جلسه (به خصوص برای کارگاه‌ها)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  topic?: string;

  @ApiProperty({
    required: false,
    example: 5,
    description:
      'آیدی اسلات برنامه هفتگی (WeeklyScheduleSlotId) که این جلسه بر اساس آن برگزار می‌شود',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  plannedScheduleSlotId?: number;
}
