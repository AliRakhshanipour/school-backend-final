import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({
    example: '1403-1404',
    description: 'لیبل سال تحصیلی (یکتا، مثلاً "1403-1404")',
  })
  @IsString()
  @MaxLength(20)
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'فرمت لیبل سال تحصیلی باید مانند 1403-1404 باشد',
  })
  label: string;

  @ApiProperty({
    example: '2024-09-22',
    description: 'تاریخ شروع سال تحصیلی (میلادی، ISO)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2025-06-20',
    description: 'تاریخ پایان سال تحصیلی (میلادی، ISO)',
  })
  @IsDateString()
  endDate: string;
}
