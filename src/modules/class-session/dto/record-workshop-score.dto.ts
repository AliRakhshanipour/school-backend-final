import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkshopScoreItemDto {
  @ApiProperty({
    example: 'student-uuid',
    description: 'شناسه هنرجو (StudentId)',
  })
  @IsString()
  @MaxLength(100)
  studentId: string;

  @ApiProperty({
    example: 25,
    description: 'نمره گزارش‌کار (۰ تا ۳۰)',
  })
  @IsInt()
  @Min(0)
  @Max(30)
  reportScore: number;

  @ApiProperty({
    example: 10,
    description: 'نمره انضباط (۰ تا ۱۰)',
  })
  @IsInt()
  @Min(0)
  @Max(10)
  disciplineScore: number;

  @ApiProperty({
    example: 8,
    description: 'نمره دقت کار (۰ تا ۱۰)',
  })
  @IsInt()
  @Min(0)
  @Max(10)
  workPrecisionScore: number;

  @ApiProperty({
    example: 20,
    description: 'نمره صحت مدار (۰ تا ۲۵)',
  })
  @IsInt()
  @Min(0)
  @Max(25)
  circuitCorrectnessScore: number;

  @ApiProperty({
    example: 22,
    description: 'نمره پاسخ به سوالات (۰ تا ۲۵)',
  })
  @IsInt()
  @Min(0)
  @Max(25)
  questionsScore: number;

  @ApiProperty({
    required: false,
    example: 'کیفیت کار خوب بود، فقط در گزارش کمی ضعف داشت',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class RecordWorkshopScoreDto {
  @ApiProperty({
    type: [WorkshopScoreItemDto],
    description:
      'لیست نمرات هنرجوها در این جلسه کارگاهی. فقط برای دروس type=WORKSHOP قابل استفاده است.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkshopScoreItemDto)
  items: WorkshopScoreItemDto[];
}
