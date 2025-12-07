import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Prisma, CourseType } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({
    example: 'ریاضی ۱',
    description: 'نام درس',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'MATH1-10',
    required: false,
    description: 'کد درس (اختیاری)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({
    enum: CourseType,
    example: CourseType.THEORY,
    description: 'نوع درس (تئوری / کارگاهی)',
  })
  @IsEnum(CourseType)
  type: CourseType;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'آیدی رشته مرتبط (FieldOfStudyId) - اختیاری',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  fieldOfStudyId?: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'آیدی پایه مرتبط (GradeLevelId) - اختیاری',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  gradeLevelId?: number;

  @ApiProperty({
    example: true,
    required: false,
    description: 'فعال بودن درس',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
