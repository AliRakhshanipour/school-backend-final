import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClassGroupDto {
  @ApiProperty({
    example: '101',
    description: 'کد کلاس (مثلاً 101، 102، ...)',
  })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({
    example: 1,
    description: 'آیدی سال تحصیلی (AcademicYearId)',
  })
  @IsInt()
  @IsPositive()
  academicYearId: number;

  @ApiProperty({
    example: 1,
    description: 'آیدی پایه (GradeLevelId)',
  })
  @IsInt()
  @IsPositive()
  gradeLevelId: number;

  @ApiProperty({
    example: 1,
    description: 'آیدی رشته تحصیلی (FieldOfStudyId)',
  })
  @IsInt()
  @IsPositive()
  fieldOfStudyId: number;

  @ApiProperty({
    example: 30,
    description: 'ظرفیت کلاس',
  })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    required: false,
    example: 2,
    description:
      'آیدی کلاس سال بعد (ClassGroupId) برای ارتقای خودکار (اختیاری)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  nextClassGroupId?: number;
}
