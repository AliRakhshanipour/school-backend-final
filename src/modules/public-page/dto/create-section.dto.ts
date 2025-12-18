// src/modules/public-page/dto/create-section.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    example: 'hero',
    description:
      'کلید یکتا برای بخش (مثلاً hero, about, contact)',
  })
  @IsString()
  @MaxLength(50)
  sectionKey: string;

  @ApiProperty({
    example: 'هنرستان فنی برق تهران',
    description: 'عنوان بخش',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: '<p>متن معرفی مدرسه ...</p>',
    description:
      'محتوای بخش (HTML/Markdown/JSON بر اساس نیاز فرانت)',
  })
  @IsString()
  content: string;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ترتیب نمایش (کوچک‌تر = بالاتر در صفحه)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({
    required: false,
    example: true,
    description: 'فعال بودن بخش',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
