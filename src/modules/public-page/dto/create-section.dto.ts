import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    example: 'hero',
    description: 'کلید یکتا برای بخش (مثلاً hero, about, contact)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(/^[a-z0-9_-]+$/, {
    message:
      'sectionKey فقط می‌تواند شامل حروف انگلیسی کوچک، عدد، خط تیره و زیرخط باشد (بدون فاصله)',
  })
  sectionKey: string;

  @ApiProperty({
    example: 'هنرستان فنی برق تهران',
    description: 'عنوان بخش',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title: string;

  @ApiProperty({
    example: '<p>متن معرفی مدرسه ...</p>',
    description: 'محتوای بخش (HTML/Markdown/JSON بر اساس نیاز فرانت)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
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
