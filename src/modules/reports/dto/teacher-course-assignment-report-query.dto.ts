import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class TeacherCourseAssignmentReportParamsDto {
  @ApiProperty({
    example: 1,
    description: 'آیدی انتساب درس-کلاس (CourseAssignmentId)',
  })
  @IsInt()
  @IsPositive()
  courseAssignmentId: number;
}
