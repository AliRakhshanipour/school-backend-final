import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExamTerm, ExamMethod, ExamCategory } from '@prisma/client';

export class CreateTheoryExamDto {
  @ApiProperty({
    enum: ExamTerm,
    example: ExamTerm.FIRST,
    description: 'نوبت امتحان (اول/دوم/تابستان)',
  })
  @IsEnum(ExamTerm)
  term: ExamTerm;

  @ApiProperty({
    enum: ExamMethod,
    example: ExamMethod.WRITTEN,
    description: 'نوع امتحان از نظر اجرا (کتبی، شفاهی، عملی)',
  })
  @IsEnum(ExamMethod)
  method: ExamMethod;

  @ApiProperty({
    enum: ExamCategory,
    example: ExamCategory.FINAL,
    description: 'نوع امتحان: کوتاه، میان‌ترم، نهایی، ...',
  })
  @IsEnum(ExamCategory)
  category: ExamCategory;

  @ApiProperty({ required: false, example: 'امتحان نوبت اول ریاضی ۱' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiProperty({ required: false, example: 'از فصل ۱ تا ۳ کتاب.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: '2025-12-10T08:00:00.000Z',
    description: 'زمان شروع امتحان (میلادی، ISO). فرانت باید از شمسی به میلادی تبدیل کند.',
  })
  @IsDateString()
  startAt: string;

  @ApiProperty({
    example: '2025-12-10T09:30:00.000Z',
    description: 'زمان پایان امتحان (باید بعد از startAt باشد)',
  })
  @IsDateString()
  endAt: string;

  @ApiProperty({
    required: false,
    example: 20,
    description: 'نمره‌ی کامل امتحان (معمولاً ۲۰، حداکثر ۱۰۰)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxScore?: number;

  @ApiProperty({
    required: false,
    example: 50,
    description: 'وزن این امتحان در نمره‌ی نهایی (به درصد، ۱ تا ۱۰۰).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  weightPercent?: number;
}
