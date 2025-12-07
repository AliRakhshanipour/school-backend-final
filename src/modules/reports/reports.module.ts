import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminReportsController } from './admin-reports.controller';
import { TeacherReportsController } from './teacher-reports.controller';
import { StudentReportsController } from './student-reports.controller';

@Module({
  providers: [ReportsService],
  controllers: [
    AdminReportsController,
    TeacherReportsController,
    StudentReportsController,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
