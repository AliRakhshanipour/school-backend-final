import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength } from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({
    example: '1404-1405',
    description: 'برچسب سال تحصیلی (مثلاً 1404-1405)',
  })
  @IsString()
  @MaxLength(20)
  label: string;

  @ApiProperty({
    example: '2025-09-22',
    description: 'تاریخ شروع سال تحصیلی (میلادی، YYYY-MM-DD)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-06-21',
    description: 'تاریخ پایان سال تحصیلی (میلادی، YYYY-MM-DD)',
  })
  @IsDateString()
  endDate: string;
}
