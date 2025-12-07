import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

export class StudentYearReportParamsDto {
  @ApiProperty({
    example: 'student-uuid',
    description: 'شناسه هنرجو (StudentId)',
  })
  @IsString()
  @MaxLength(100)
  studentId: string;

  @ApiProperty({
    example: 1,
    description: 'آیدی سال تحصیلی (AcademicYearId)',
  })
  @IsInt()
  @IsPositive()
  academicYearId: number;
}
