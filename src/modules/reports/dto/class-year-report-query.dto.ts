import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class ClassYearReportParamsDto {
  @ApiProperty({
    example: 1,
    description: 'آیدی کلاس (ClassGroupId)',
  })
  @IsInt()
  @IsPositive()
  classGroupId: number;

  @ApiProperty({
    example: 1,
    description: 'آیدی سال تحصیلی (AcademicYearId)',
  })
  @IsInt()
  @IsPositive()
  academicYearId: number;
}
