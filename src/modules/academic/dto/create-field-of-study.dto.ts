import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SchoolType, ShiftType } from '@prisma/client';

export class CreateFieldOfStudyDto {
  @ApiProperty({
    example: 'برق صنعتی',
    description: 'نام رشته تحصیلی',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    enum: SchoolType,
    example: SchoolType.TECHNICAL_VOCATIONAL,
    description: 'نوع مدرسه (فنی حرفه‌ای / کار و دانش)',
  })
  @IsEnum(SchoolType)
  schoolType: SchoolType;

  @ApiProperty({
    enum: ShiftType,
    example: ShiftType.MORNING,
    description: 'شیفت رشته (صبح/عصر/شب)',
  })
  @IsEnum(ShiftType)
  shift: ShiftType;

  @ApiProperty({
    example: true,
    required: false,
    description: 'آیا رشته فعال است؟',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
