// src/modules/auth/dto/refresh-token.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token دریافت‌شده در هنگام لاگین',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  refreshToken: string;
}
