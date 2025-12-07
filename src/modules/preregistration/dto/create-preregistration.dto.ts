import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  LivingSituation,
  PreRegistrationStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { PreRegistrationParentDto } from './preregistration-parent.dto';

export class CreatePreRegistrationDto {
  @ApiProperty({ example: 'محمد' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'رضایی' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    example: '1234567890',
    description: 'کد ملی هنرجو (۱۰ رقم)',
  })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد' })
  nationalId: string;

  @ApiProperty({ example: 'علی', description: 'نام پدر' })
  @IsString()
  @MaxLength(50)
  fatherName: string;

  @ApiProperty({
    enum: LivingSituation,
    example: LivingSituation.BOTH_PARENTS,
  })
  @IsEnum(LivingSituation)
  livingSituation: LivingSituation;

  @ApiProperty({
    example: '1387-09-02',
    description:
      'تاریخ تولد به صورت میلادی (YYYY-MM-DD). فرانت باید از شمسی به میلادی تبدیل کند.',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    example: 'د 12/321090',
    required: false,
    description: 'سریال شناسنامه (اختیاری)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  birthCertificateSeries?: string;

  @ApiProperty({
    example: false,
    description: 'آیا هنرجو چپ‌دست است؟',
  })
  @IsBoolean()
  isLeftHanded: boolean;

  @ApiProperty({
    example: false,
    description: 'آیا هنرجو دارای معلولیت است؟',
  })
  @IsBoolean()
  hasDisability: boolean;

  @ApiProperty({
    required: false,
    description: 'توضیح نوع معلولیت (در صورت وجود)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  disabilityDescription?: string;

  @ApiProperty({
    example: false,
    description: 'آیا هنرجو بیماری خاص دارد؟',
  })
  @IsBoolean()
  hasChronicDisease: boolean;

  @ApiProperty({
    required: false,
    description: 'توضیح بیماری خاص',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  chronicDiseaseDescription?: string;

  @ApiProperty({
    example: false,
    description: 'آیا هنرجو داروی خاص مصرف می‌کند؟',
  })
  @IsBoolean()
  hasSpecialMedication: boolean;

  @ApiProperty({
    required: false,
    description: 'توضیح داروی خاص',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialMedicationDescription?: string;

  @ApiProperty({
    required: false,
    example: 18.75,
    description: 'معدل سال قبل (از ۲۰)',
  })
  @IsOptional()
  @IsNumber()
  lastYearAverage?: number;

  @ApiProperty({
    required: false,
    example: 17.5,
    description: 'نمره ریاضی سال قبل',
  })
  @IsOptional()
  @IsNumber()
  lastYearMathScore?: number;

  @ApiProperty({
    required: false,
    example: 20,
    description: 'نمره انضباط سال قبل',
  })
  @IsOptional()
  @IsNumber()
  lastYearDisciplineScore?: number;

  @ApiProperty({
    required: false,
    example: 'کلاس نهم',
    description: 'مقطع سال قبل (مثلاً کلاس نهم)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastYearEducationLevel?: string;

  @ApiProperty({
    required: false,
    example: 'دبیرستان شهید ...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  previousSchoolName?: string;

  @ApiProperty({
    required: false,
    example: 'تهران، خیابان ...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  previousSchoolAddress?: string;

  @ApiProperty({
    required: false,
    example: '02112345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  previousSchoolPhone?: string;

  @ApiProperty({
    example: '09123456789',
    description:
      'شماره تماس اصلی برای پیگیری وضعیت (الزاماً موبایل با فرمت 09xxxxxxxxx)',
  })
  @Matches(/^09\d{9}$/, {
    message: 'شماره تماس نامعتبر است',
  })
  contactPhone: string;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'آیدی رشته/شیفت انتخابی هنرجو (FieldOfStudyId)',
  })
  @IsOptional()
  @IsNumber()
  requestedFieldOfStudyId?: number;

  @ApiProperty({
    type: [PreRegistrationParentDto],
    description:
      'اطلاعات والدین/اولیا در فرم پیش‌ثبت‌نام. حداقل یکی توصیه می‌شود.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreRegistrationParentDto)
  parents: PreRegistrationParentDto[];
}
