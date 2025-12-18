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
import { ParentRelationType, EducationLevel } from '@prisma/client';

export class CreateParentDto {
  @ApiProperty({
    enum: ParentRelationType,
    example: ParentRelationType.FATHER,
    description: 'نسبت با هنرجو (پدر/مادر/سایر)',
  })
  @IsEnum(ParentRelationType)
  relation: ParentRelationType;

  @ApiProperty({ example: 'رضا', description: 'نام' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'محمدی', description: 'نام خانوادگی' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    required: false,
    example: '1234567890',
    description: 'کد ملی (اختیاری)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی والد باید ۱۰ رقمی باشد' })
  nationalId?: string;

  @ApiProperty({
    required: false,
    example: '123456',
    description: 'شماره شناسنامه',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  birthCertificateNumber?: string;

  @ApiProperty({
    required: false,
    example: '09121234567',
    description: 'شماره موبایل',
  })
  @IsOptional()
  @IsString()
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل نامعتبر است' })
  mobilePhone?: string;

  @ApiProperty({
    required: false,
    enum: EducationLevel,
    example: EducationLevel.DIPLOMA,
    description: 'مدرک تحصیلی',
  })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @ApiProperty({ required: false, example: 'کارمند بانک' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiProperty({ required: false, example: 'تهران' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  birthPlace?: string;

  @ApiProperty({ required: false, example: 'قم' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  idCardIssuePlace?: string;

  @ApiProperty({ required: false, example: true, description: 'در قید حیات است؟' })
  @IsOptional()
  @IsBoolean()
  isAlive?: boolean;

  @ApiProperty({ required: false, example: 'تهران، خیابان آزادی...' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  homeAddress?: string;

  @ApiProperty({ required: false, example: 'تهران، میدان ولیعصر...' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  workAddress?: string;

  @ApiProperty({ required: false, example: '02166554433' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  workPhone?: string;

  @ApiProperty({ required: false, example: false, description: 'آیا سابقه حضور در جنگ/ایثارگری دارد؟' })
  @IsOptional()
  @IsBoolean()
  hasWarParticipation?: boolean;

  @ApiProperty({ required: false, example: 25, description: 'درصد جانبازی (۰ تا ۱۰۰)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  veteranPercent?: number;
}
