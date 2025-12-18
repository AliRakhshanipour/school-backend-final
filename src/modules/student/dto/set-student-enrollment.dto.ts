import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetStudentEnrollmentDto {
  @ApiProperty({
    example: 1,
    description: 'آیدی سال تحصیلی (AcademicYearId)',
  })
  @IsInt()
  @Min(1)
  academicYearId: number;

  @ApiProperty({
    example: 3,
    description: 'آیدی کلاس (ClassGroupId) در همان سال',
  })
  @IsInt()
  @Min(1)
  classGroupId: number;
}
