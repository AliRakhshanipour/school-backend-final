import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateTheoryExamDto } from './create-theory-exam.dto';

export class CreateTheoryExamByAdminDto extends CreateTheoryExamDto {
  @ApiProperty({
    example: 123,
    description: 'آیدی انتساب درس-کلاس (CourseAssignmentId)',
  })
  @IsInt()
  @Min(1)
  courseAssignmentId: number;
}
