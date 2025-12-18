import { Module } from '@nestjs/common';
import { CoursesService } from './courses/courses.service';
import { CoursesController } from './courses/courses.controller';
import { CourseAssignmentsService } from './assignments/course-assignments.service';
import { CourseAssignmentsController } from './assignments/course-assignments.controller';
import { ScheduleService } from './schedule/schedule.service';
import { ScheduleController } from './schedule/schedule.controller';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  providers: [CoursesService, CourseAssignmentsService, ScheduleService],
  controllers: [CoursesController, CourseAssignmentsController, ScheduleController],
  exports: [CoursesService, CourseAssignmentsService, ScheduleService, AttendanceModule],
})
export class TeachingModule {}
