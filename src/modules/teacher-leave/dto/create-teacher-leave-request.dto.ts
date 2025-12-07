import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateTeacherLeaveRequestDto {
  @ApiProperty({
    enum: LeaveType,
    required: false,
    description: 'نوع مرخصی (استعلاجی، شخصی، اداری، ...)',
    example: LeaveType.SICK,
  })
  @IsOptional()
  @IsEnum(LeaveType)
  type?: LeaveType;

  @ApiProperty({
    example: '2025-12-05T08:00:00.000Z',
    description:
      'تاریخ و ساعت شروع مرخصی (میلادی، ISO). فرانت باید تاریخ شمسی را تبدیل کند.',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2025-12-05T14:00:00.000Z',
    description:
      'تاریخ و ساعت پایان مرخصی (میلادی، ISO). باید بعد از startDate باشد.',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    example: true,
    description: 'آیا مرخصی کل روز است؟',
  })
  @IsBoolean()
  isFullDay: boolean;

  @ApiProperty({
    example: 'مرخصی به دلیل شرکت در دوره ضمن خدمت.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
