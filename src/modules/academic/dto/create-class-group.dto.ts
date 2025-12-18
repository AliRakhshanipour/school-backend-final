import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClassGroupDto {
  @ApiProperty({
    example: '101',
    description: 'کد کلاس (در هر سال باید یکتا باشد، مثلاً 101، 201)',
  })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({
    example: 1,
    description: 'آیدی سال تحصیلی (AcademicYearId)',
  })
  @IsInt()
  @Min(1)
  academicYearId: number;

  @ApiProperty({
    example: 1,
    description: 'آیدی پایه (GradeLevelId)',
  })
  @IsInt()
  @Min(1)
  gradeLevelId: number;

  @ApiProperty({
    example: 2,
    description: 'آیدی رشته (FieldOfStudyId)',
  })
  @IsInt()
  @Min(1)
  fieldOfStudyId: number;

  @ApiProperty({
    required: false,
    example: 30,
    description: 'ظرفیت کلاس (پیش‌فرض ۳۰)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({
    required: false,
    example: 5,
    description:
      'آیدی کلاس سال بعد (nextClassGroupId) برای ارتقای خودکار (اختیاری)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  nextClassGroupId?: number;
}
