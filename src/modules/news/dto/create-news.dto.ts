// src/modules/news/dto/create-news.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Prisma, NewsVisibility } from '@prisma/client';

export class CreateNewsDto {
  @ApiProperty({
    example: 'آغاز سال تحصیلی ۱۴۰۳-۱۴۰۴',
    description: 'عنوان خبر',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'start-of-1403-1404',
    required: false,
    description:
      'اسلاگ URL خبر. اگر ارسال نشود از روی عنوان ساخته می‌شود.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiProperty({
    example: 'سال تحصیلی جدید از اول مهر آغاز می‌شود...',
    required: false,
    description: 'خلاصه کوتاه برای لیست خبرها',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({
    example: '<p>متن کامل خبر به صورت HTML یا Markdown</p>',
    description: 'متن کامل خبر',
  })
  @IsString()
  content: string;

  @ApiProperty({
    enum: NewsVisibility,
    example: NewsVisibility.PUBLIC,
    description:
      'سطح نمایش خبر (عمومی، فقط لاگین، فقط دانش‌آموزان و ...)',
    required: false,
  })
  @IsOptional()
  @IsEnum(NewsVisibility)
  visibility?: NewsVisibility;

  @ApiProperty({
    example: true,
    required: false,
    description: 'آیا خبر منتشر شده است؟',
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiProperty({
    example: '2025-09-23T06:30:00.000Z',
    required: false,
    description:
      'تاریخ شروع نمایش خبر (اگر خالی باشد و isPublished=true، الان ست می‌شود)',
  })
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @ApiProperty({
    example: '2025-10-01T06:30:00.000Z',
    required: false,
    description:
      'تاریخ پایان نمایش خبر (اختیاری، برای اطلاعیه‌های موقت)',
  })
  @IsOptional()
  @IsDateString()
  expireAt?: string;
}
