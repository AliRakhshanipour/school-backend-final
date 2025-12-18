import { PartialType } from '@nestjs/swagger';
import { CreateTeacherAttendanceDto } from './create-teacher-attendance.dto';

export class UpdateTeacherAttendanceDto extends PartialType(CreateTeacherAttendanceDto) {}
