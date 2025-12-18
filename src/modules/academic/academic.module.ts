import { Module } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { AcademicYearController } from './academic-year.controller';
import { GradeLevelController } from './grade-level.controller';
import { FieldOfStudyController } from './field-of-study.controller';
import { ClassGroupController } from './class-group.controller';
import { PromotionController } from './promotion.controller';

@Module({
  providers: [AcademicService],
  controllers: [
    AcademicYearController,
    GradeLevelController,
    FieldOfStudyController,
    ClassGroupController,
    PromotionController,
  ],
  exports: [AcademicService],
})
export class AcademicModule {}
