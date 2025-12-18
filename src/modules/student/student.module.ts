import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { AdminStudentController } from './admin-student.controller';
import { StudentProfileController } from './student-profile.controller';

@Module({
  providers: [StudentService],
  controllers: [AdminStudentController, StudentProfileController],
  exports: [StudentService],
})
export class StudentModule {}
