import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('student-profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('student/profile')
export class StudentProfileController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ApiOperation({
    summary:
      'پروفایل هنرجو (خودش) به همراه ثبت‌نام‌ها و اطلاعات والدین',
  })
  getMyProfile(@GetUser('userId') userId: string) {
    return this.studentService.getProfileByUser(userId);
  }
}
