import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CheckStatusDto {
  @ApiProperty({
    example: '1234567890',
    description: 'کد ملی هنرجو (۱۰ رقم)',
  })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقمی باشد' })
  nationalId: string;

  @ApiProperty({
    example: '09123456789',
    description: 'شماره تماسی که هنگام پیش‌ثبت‌نام وارد شده',
  })
  @Matches(/^09\d{9}$/, {
    message: 'شماره تماس نامعتبر است',
  })
  contactPhone: string;
}
