import { Module } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import { AcademicYearController } from './academic-year.controller';
import { FieldOfStudyService } from './field-of-study.service';
import { FieldOfStudyController } from './field-of-study.controller';
import { PublicFieldOfStudyController } from './public-field-of-study.controller';
import { ClassGroupService } from './class-group.service';
import { ClassGroupController } from './class-group.controller';

@Module({
  providers: [
    AcademicYearService,
    FieldOfStudyService,
    ClassGroupService,
  ],
  controllers: [
    AcademicYearController,
    FieldOfStudyController,
    PublicFieldOfStudyController,
    ClassGroupController,
  ],
  exports: [FieldOfStudyService, ClassGroupService, AcademicYearService],
})
export class AcademicModule {}
