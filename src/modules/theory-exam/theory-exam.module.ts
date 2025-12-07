import { Module } from '@nestjs/common';
import { TheoryExamService } from './theory-exam.service';
import { TheoryExamTeacherController } from './theory-exam-teacher.controller';
import { TheoryExamAdminController } from './theory-exam-admin.controller';

@Module({
  providers: [TheoryExamService],
  controllers: [TheoryExamTeacherController, TheoryExamAdminController],
  exports: [TheoryExamService],
})
export class TheoryExamModule {}
