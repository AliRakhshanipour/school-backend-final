import { ApiProperty } from '@nestjs/swagger';
import { PreRegistrationStatus } from '@prisma/client';

export class PreRegistrationStatusResponseDto {
  @ApiProperty({ enum: PreRegistrationStatus })
  status: PreRegistrationStatus;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  fieldOfStudyName?: string;

  @ApiProperty({ required: false })
  schoolType?: string;

  @ApiProperty({ required: false })
  shift?: string;

  @ApiProperty({ required: false })
  classCode?: string;

  @ApiProperty({ required: false })
  gradeLevel?: string;

  @ApiProperty({ required: false })
  academicYearLabel?: string;
}
