import { PartialType } from '@nestjs/swagger';
import { CreateCourseAssignmentDto } from './create-course-assignment.dto';

export class UpdateCourseAssignmentDto extends PartialType(
  CreateCourseAssignmentDto,
) {}
