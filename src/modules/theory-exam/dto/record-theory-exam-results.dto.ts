import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TheoryExamResultItemDto {
  @ApiProperty({
    example: 'student-uuid',
    description: 'شناسه هنرجو (StudentId)',
  })
  @IsString()
  @MaxLength(100)
  studentId: string;

  @ApiProperty({
    example: 17.5,
    description: 'نمره امتحان (۰ تا maxScore). تا یک اعشار (مثلاً ۱۷.۵)',
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  score: number;

  @ApiProperty({
    required: false,
    example: 'امتحان خوب بود؛ کمی در سوالات تشریحی ضعف داشت.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class RecordTheoryExamResultsDto {
  @ApiProperty({
    type: [TheoryExamResultItemDto],
    description: 'لیست نمرات هنرجوها برای این امتحان.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TheoryExamResultItemDto)
  items: TheoryExamResultItemDto[];
}
