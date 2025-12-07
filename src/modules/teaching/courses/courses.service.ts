import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    if (dto.code) {
      const existingCode = await this.prisma.course.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new BadRequestException('کد درس تکراری است');
      }
    }

    if (dto.fieldOfStudyId) {
      const field = await this.prisma.fieldOfStudy.findUnique({
        where: { id: dto.fieldOfStudyId },
      });
      if (!field) {
        throw new BadRequestException('رشته انتخاب‌شده وجود ندارد');
      }
    }

    if (dto.gradeLevelId) {
      const grade = await this.prisma.gradeLevel.findUnique({
        where: { id: dto.gradeLevelId },
      });
      if (!grade) {
        throw new BadRequestException('پایه انتخاب‌شده وجود ندارد');
      }
    }

    return this.prisma.course.create({
      data: {
        name: dto.name,
        code: dto.code ?? null,
        type: dto.type,
        fieldOfStudyId: dto.fieldOfStudyId ?? null,
        gradeLevelId: dto.gradeLevelId ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.course.findMany({
      orderBy: { name: 'asc' },
      include: {
        fieldOfStudy: true,
        gradeLevel: true,
      },
    });
  }

  async findOne(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        fieldOfStudy: true,
        gradeLevel: true,
      },
    });
    if (!course) {
      throw new NotFoundException('درس پیدا نشد');
    }
    return course;
  }

  async update(id: number, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });
    if (!course) {
      throw new NotFoundException('درس پیدا نشد');
    }

    if (dto.code && dto.code !== course.code) {
      const existingCode = await this.prisma.course.findUnique({
        where: { code: dto.code },
      });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException('کد درس تکراری است');
      }
    }

    if (dto.fieldOfStudyId) {
      const field = await this.prisma.fieldOfStudy.findUnique({
        where: { id: dto.fieldOfStudyId },
      });
      if (!field) {
        throw new BadRequestException('رشته انتخاب‌شده وجود ندارد');
      }
    }

    if (dto.gradeLevelId) {
      const grade = await this.prisma.gradeLevel.findUnique({
        where: { id: dto.gradeLevelId },
      });
      if (!grade) {
        throw new BadRequestException('پایه انتخاب‌شده وجود ندارد');
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        name: dto.name ?? course.name,
        code: dto.code ?? course.code,
        type: dto.type ?? course.type,
        fieldOfStudyId: dto.fieldOfStudyId ?? course.fieldOfStudyId,
        gradeLevelId: dto.gradeLevelId ?? course.gradeLevelId,
        isActive:
          typeof dto.isActive === 'boolean' ? dto.isActive : course.isActive,
      },
    });
  }

  async remove(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        assignments: true,
      },
    });
    if (!course) {
      throw new NotFoundException('درس پیدا نشد');
    }

    if (course.assignments.length > 0) {
      throw new BadRequestException(
        'امکان حذف درسی که به کلاس‌ها انتساب داده شده وجود ندارد',
      );
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { success: true };
  }
}
