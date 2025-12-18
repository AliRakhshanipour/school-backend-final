import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateGradeLevelDto {
  @ApiProperty({
    example: '10',
    description: 'نام پایه (مثلاً "10" یا "12")',
  })
  @IsString()
  @MaxLength(20)
  name: string;

  @ApiProperty({
    example: 1,
    description: 'ترتیب پایه برای ارتقا (۱ برای دهم، ۲ برای یازدهم، ...)',
  })
  @IsInt()
  @Min(1)
  order: number;
}
