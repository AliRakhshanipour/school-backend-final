import { Module } from '@nestjs/common';
import { TeacherLeaveService } from './teacher-leave.service';
import { TeacherLeaveTeacherController } from './teacher-leave-teacher.controller';
import { TeacherLeaveAdminController } from './teacher-leave-admin.controller';

@Module({
  providers: [TeacherLeaveService],
  controllers: [TeacherLeaveTeacherController, TeacherLeaveAdminController],
  exports: [TeacherLeaveService],
})
export class TeacherLeaveModule {}
