import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { LivingSituation } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'stu.1403.001', description: 'نام کاربری هنرجو برای لاگین' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'StrongPass123!', description: 'رمز عبور اولیه هنرجو (حداقل 8 کاراکتر)' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'علی', description: 'نام هنرجو' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'محمدی', description: 'نام خانوادگی هنرجو' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'حسین', description: 'نام پدر' })
  @IsString()
  @MaxLength(50)
  fatherName: string;

  @ApiProperty({ example: '1234567890', description: 'کد ملی ۱۰ رقمی هنرجو' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید شامل ۱۰ رقم باشد' })
  nationalId: string;

  @ApiProperty({ enum: LivingSituation, example: LivingSituation.BOTH_PARENTS, description: 'با چه کسی زندگی می‌کند' })
  @IsEnum(LivingSituation)
  livingSituation: LivingSituation;

  @ApiProperty({ example: 'د 12/321090', required: false, description: 'سریال شناسنامه (اختیاری)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  birthCertificateSeries?: string;

  @ApiProperty({
    example: '2008-11-23',
    description: 'تاریخ تولد به صورت میلادی (ISO). فرانت از شمسی به میلادی تبدیل می‌کند.',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: false, description: 'آیا هنرجو چپ‌دست است؟' })
  @IsBoolean()
  isLeftHanded: boolean;

  @ApiProperty({ example: false, description: 'آیا هنرجو معلولیت دارد؟' })
  @IsBoolean()
  hasDisability: boolean;

  @ApiProperty({ required: false, example: 'کم‌شنوایی خفیف' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  disabilityDescription?: string;

  @ApiProperty({ example: false, description: 'آیا هنرجو بیماری خاص دارد؟' })
  @IsBoolean()
  hasChronicDisease: boolean;

  @ApiProperty({ required: false, example: 'آسم' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  chronicDiseaseDescription?: string;

  @ApiProperty({ example: false, description: 'آیا هنرجو داروی خاص مصرف می‌کند؟' })
  @IsBoolean()
  hasSpecialMedication: boolean;

  @ApiProperty({ required: false, example: 'اسپری تنفسی' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialMedicationDescription?: string;

  @ApiProperty({ required: false, example: 18.75, description: 'معدل سال قبل (۰ تا ۲۰)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  lastYearAverage?: number;

  @ApiProperty({ required: false, example: 19, description: 'نمره ریاضی سال قبل (۰ تا ۲۰)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  lastYearMathScore?: number;

  @ApiProperty({ required: false, example: 20, description: 'نمره انضباط سال قبل (۰ تا ۲۰)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  lastYearDisciplineScore?: number;

  @ApiProperty({ required: false, example: 'پایه نهم', description: 'مقطع سال قبل' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastYearEducationLevel?: string;

  @ApiProperty({ required: false, example: 'دبیرستان نمونه دولتی شهید بهشتی' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  previousSchoolName?: string;

  @ApiProperty({ required: false, example: 'تهران، خیابان انقلاب، پلاک ۱۵' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  previousSchoolAddress?: string;

  @ApiProperty({ required: false, example: '02112345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  previousSchoolPhone?: string;

  @ApiProperty({ required: false, example: 1, description: 'آیدی سال تحصیلی (اختیاری)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  academicYearId?: number;

  @ApiProperty({ required: false, example: 3, description: 'آیدی کلاس (اختیاری)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  classGroupId?: number;
}
