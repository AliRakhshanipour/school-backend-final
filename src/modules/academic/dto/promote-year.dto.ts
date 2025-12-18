import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, Min } from 'class-validator';

export class PromoteYearDto {
  @ApiProperty({
    example: 1,
    description: 'آیدی سال مبدا (fromAcademicYearId)',
  })
  @IsInt()
  @Min(1)
  fromAcademicYearId: number;

  @ApiProperty({
    example: 2,
    description: 'آیدی سال مقصد (toAcademicYearId)',
  })
  @IsInt()
  @Min(1)
  toAcademicYearId: number;

  @ApiProperty({
    required: false,
    example: true,
    description:
      'اگر true باشد، فقط شبیه‌سازی (dry run) انجام می‌شود و دیتابیس تغییر نمی‌کند.',
  })
  @IsBoolean()
  dryRun: boolean = false;
}
