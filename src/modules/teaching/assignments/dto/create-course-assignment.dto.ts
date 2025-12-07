import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateCourseAssignmentDto {
  @ApiProperty({
    example: 1,
    description: 'آیدی سال تحصیلی (AcademicYearId)',
  })
  @IsInt()
  @IsPositive()
  academicYearId: number;

  @ApiProperty({
    example: 1,
    description: 'آیدی کلاس (ClassGroupId)',
  })
  @IsInt()
  @IsPositive()
  classGroupId: number;

  @ApiProperty({
    example: 1,
    description: 'آیدی درس (CourseId)',
  })
  @IsInt()
  @IsPositive()
  courseId: number;

  @ApiProperty({
    example: 'teacher-id-uuid',
    description: 'آیدی معلم اصلی (TeacherId)',
  })
  @IsString()
  mainTeacherId: string;

  @ApiProperty({
    example: 'assistant-teacher-id-uuid',
    required: false,
    description: 'آیدی معلم کمکی (اختیاری)',
  })
  @IsOptional()
  @IsString()
  assistantTeacherId?: string;

  @ApiProperty({
    example: 2,
    description: 'تعداد ساعت هفتگی این درس برای این کلاس',
  })
  @IsInt()
  @Min(1)
  weeklyHours: number;
}
