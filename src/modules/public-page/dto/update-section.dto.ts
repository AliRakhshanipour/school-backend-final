// src/modules/public-page/dto/update-section.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateSectionDto } from './create-section.dto';

export class UpdateSectionDto extends PartialType(
  CreateSectionDto,
) {}
