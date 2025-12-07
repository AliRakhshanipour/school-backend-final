import { Module } from '@nestjs/common';
import { ClassSessionService } from './class-session.service';
import { TeacherClassSessionController } from './teacher-class-session.controller';
import { AdminClassSessionController } from './admin-class-session.controller';

@Module({
  providers: [ClassSessionService],
  controllers: [TeacherClassSessionController, AdminClassSessionController],
  exports: [ClassSessionService],
})
export class ClassSessionModule {}
