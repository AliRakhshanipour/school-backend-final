import { ApiProperty } from '@nestjs/swagger';

export class PreRegistrationWindowStatusDto {
  @ApiProperty()
  isOpen: boolean;

  @ApiProperty({ required: false })
  academicYearLabel?: string;

  @ApiProperty({ required: false })
  startAt?: Date;

  @ApiProperty({ required: false })
  endAt?: Date;
}
