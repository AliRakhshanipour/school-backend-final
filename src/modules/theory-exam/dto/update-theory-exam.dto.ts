import { PartialType } from '@nestjs/swagger';
import { CreateTheoryExamDto } from './create-theory-exam.dto';

export class UpdateTheoryExamDto extends PartialType(CreateTheoryExamDto) {}
