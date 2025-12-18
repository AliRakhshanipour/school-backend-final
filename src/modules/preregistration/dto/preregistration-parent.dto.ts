import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { EducationLevel, ParentRelationType } from '@prisma/client';

export class PreRegistrationParentDto {
  @ApiProperty({
    enum: ParentRelationType,
    description: 'نسبت (پدر، مادر، سایر ولی)',
    example: ParentRelationType.FATHER,
  })
  @IsEnum(ParentRelationType)
  relation: ParentRelationType;

  @ApiProperty({ example: 'علی' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'رحیمی' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    example: '1234567890',
    required: false,
    description: 'کد ملی (اختیاری)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی والد باید ۱۰ رقمی باشد' })
  nationalId?: string;

  @ApiProperty({
    example: '123456',
    required: false,
    description: 'شماره شناسنامه',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  birthCertificateNumber?: string;

  @ApiProperty({
    example: '09123456789',
    required: false,
    description: 'شماره موبایل',
  })
  @IsOptional()
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره موبایل والد نامعتبر است',
  })
  mobilePhone?: string;

  @ApiProperty({
    enum: EducationLevel,
    required: false,
    description: 'مدرک تحصیلی والد',
  })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @ApiProperty({
    example: 'کارمند',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiProperty({
    example: 'تهران',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthPlace?: string;

  @ApiProperty({
    example: 'تهران',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idCardIssuePlace?: string;

  @ApiProperty({
    example: 'تهران، خیابان ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  homeAddress?: string;

  @ApiProperty({
    example: 'تهران، شرکت ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  workAddress?: string;

  @ApiProperty({
    example: '02112345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  workPhone?: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'آیا رزمنده/ایثارگر است؟',
  })
  @IsOptional()
  @IsBoolean()
  hasWarParticipation?: boolean;

  @ApiProperty({
    example: 25,
    required: false,
    description: 'درصد جانبازی (۰ تا ۱۰۰)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  veteranPercent?: number;
}
