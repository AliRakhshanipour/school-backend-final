import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { SetStudentEnrollmentDto } from './dto/set-student-enrollment.dto';
import { UploadStudentPhotoDto } from './dto/upload-student-photo.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { Express } from 'express';

@ApiTags('admin-students')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/students')
export class AdminStudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد هنرجو جدید (همراه با حساب کاربری)' })
  create(@Body() dto: CreateStudentDto) {
    return this.studentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست هنرجوها با فیلتر بر اساس جستجو / سال تحصیلی / کلاس' })
  @ApiQuery({ name: 'search', required: false, description: 'نام، نام خانوادگی، کدملی یا نام کاربری' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'classGroupId', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('academicYearId') academicYearIdRaw?: string,
    @Query('classGroupId') classGroupIdRaw?: string,
  ) {
    const academicYearId = academicYearIdRaw ? parseInt(academicYearIdRaw, 10) : undefined;
    const classGroupId = classGroupIdRaw ? parseInt(classGroupIdRaw, 10) : undefined;

    return this.studentService.findAll(
      search,
      Number.isNaN(academicYearId as any) ? undefined : academicYearId,
      Number.isNaN(classGroupId as any) ? undefined : classGroupId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات یک هنرجو (به همراه والدین و ثبت‌نام‌ها)' })
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش اطلاعات هنرجو' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentService.update(id, dto);
  }

  @Patch(':id/enrollment')
  @ApiOperation({ summary: 'ثبت/ویرایش ثبت‌نام هنرجو در یک سال تحصیلی و کلاس' })
  setEnrollment(@Param('id') id: string, @Body() dto: SetStudentEnrollmentDto) {
    return this.studentService.setEnrollment(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف هنرجو (اگر داده‌های آموزشی دارد، خطا برمی‌گرداند)' })
  remove(@Param('id') id: string) {
    return this.studentService.remove(id);
  }

  // ---------- عکس هنرجو ----------

  @Patch(':id/photo')
  @ApiOperation({ summary: 'آپلود/آپدیت عکس هنرجو (۳x۴، JPEG/PNG، حداکثر 200KB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'فایل عکس هنرجو', type: UploadStudentPhotoDto })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadRoot = path.join(process.cwd(), 'uploads', 'students');
          fs.mkdirSync(uploadRoot, { recursive: true });
          cb(null, uploadRoot);
        },
        filename: (req, file, cb) => {
          const studentId = req.params.id;
          const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
          const safeExt = ['.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.jpg';
          cb(null, `${studentId}-${Date.now()}${safeExt}`);
        },
      }),
      limits: { fileSize: 200 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('فقط فرمت‌های JPEG و PNG مجاز هستند') as any, false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('فایل عکس ارسال نشده است');
    }
    return this.studentService.updatePhoto(id, file);
  }

  // ---------- مدیریت والدین ----------

  @Post(':id/parents')
  @ApiOperation({ summary: 'افزودن والد/ولی برای هنرجو' })
  addParent(@Param('id') id: string, @Body() dto: CreateParentDto) {
    return this.studentService.addParent(id, dto);
  }

  @Patch(':id/parents/:parentId')
  @ApiOperation({ summary: 'ویرایش اطلاعات والد/ولی' })
  updateParent(
    @Param('id') id: string,
    @Param('parentId') parentId: string,
    @Body() dto: UpdateParentDto,
  ) {
    return this.studentService.updateParent(id, parentId, dto);
  }

  @Delete(':id/parents/:parentId')
  @ApiOperation({ summary: 'حذف والد/ولی از هنرجو' })
  removeParent(@Param('id') id: string, @Param('parentId') parentId: string) {
    return this.studentService.removeParent(id, parentId);
  }
}
