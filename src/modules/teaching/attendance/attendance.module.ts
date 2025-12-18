import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceTeacherController } from './attendance-teacher.controller';
import { AttendanceAdminController } from './attendance-admin.controller';
import { TeacherAttendanceAdminController } from './teacher-attendance-admin.controller';

@Module({
  providers: [AttendanceService],
  controllers: [AttendanceTeacherController, AttendanceAdminController, TeacherAttendanceAdminController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
