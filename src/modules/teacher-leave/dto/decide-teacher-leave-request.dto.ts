import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideTeacherLeaveRequestDto {
  @ApiProperty({
    example: 'درخواست شما به دلیل هم‌زمانی با امتحانات پایان‌ترم رد شد.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNote?: string;
}
