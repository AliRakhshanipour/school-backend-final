import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(
  // username/password/academicYearId/classGroupId از این DTO حذف می‌شن
  OmitType(CreateStudentDto, [
    'username',
    'password',
    'academicYearId',
    'classGroupId',
  ] as const),
) {}
