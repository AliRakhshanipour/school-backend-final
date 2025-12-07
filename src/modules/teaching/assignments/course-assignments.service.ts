import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseAssignmentDto } from './dto/create-course-assignment.dto';
import { UpdateCourseAssignmentDto } from './dto/update-course-assignment.dto';

@Injectable()
export class CourseAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseAssignmentDto) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) {
      throw new BadRequestException('سال تحصیلی وجود ندارد');
    }

    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id: dto.classGroupId },
    });
    if (!classGroup) {
      throw new BadRequestException('کلاس انتخاب‌شده وجود ندارد');
    }

    if (classGroup.academicYearId !== academicYear.id) {
      throw new BadRequestException(
        'کلاس انتخاب‌شده متعلق به این سال تحصیلی نیست',
      );
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new BadRequestException('درس انتخاب‌شده وجود ندارد');
    }

    const mainTeacher = await this.prisma.teacher.findUnique({
      where: { id: dto.mainTeacherId },
    });
    if (!mainTeacher) {
      throw new BadRequestException('معلم اصلی وجود ندارد');
    }

    if (dto.assistantTeacherId) {
      const assistant = await this.prisma.teacher.findUnique({
        where: { id: dto.assistantTeacherId },
      });
      if (!assistant) {
        throw new BadRequestException('معلم کمکی وجود ندارد');
      }
    }

    // چک یکتا بودن (سال، کلاس، درس)
    const existing = await this.prisma.courseAssignment.findUnique({
      where: {
        UniqueClassCoursePerYear: {
          academicYearId: dto.academicYearId,
          classGroupId: dto.classGroupId,
          courseId: dto.courseId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'برای این کلاس در این سال تحصیلی، این درس قبلاً ثبت شده است',
      );
    }

    return this.prisma.courseAssignment.create({
      data: {
        academicYearId: dto.academicYearId,
        classGroupId: dto.classGroupId,
        courseId: dto.courseId,
        mainTeacherId: dto.mainTeacherId,
        assistantTeacherId: dto.assistantTeacherId ?? null,
        weeklyHours: dto.weeklyHours,
      },
      include: {
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
        course: true,
        mainTeacher: true,
        assistantTeacher: true,
      },
    });
  }

  async findAllByClass(classGroupId: number) {
    return this.prisma.courseAssignment.findMany({
      where: { classGroupId },
      include: {
        academicYear: true,
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
        course: true,
        mainTeacher: {
          include: { user: true },
        },
        assistantTeacher: {
          include: { user: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
      include: {
        academicYear: true,
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
        course: true,
        mainTeacher: {
          include: { user: true },
        },
        assistantTeacher: {
          include: { user: true },
        },
        scheduleSlots: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    }

    return assignment;
  }

  async update(id: number, dto: UpdateCourseAssignmentDto) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException('انتساب پیدا نشد');
    }

    let academicYearId = assignment.academicYearId;
    let classGroupId = assignment.classGroupId;
    let courseId = assignment.courseId;

    if (
      dto.academicYearId &&
      dto.academicYearId !== assignment.academicYearId
    ) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: dto.academicYearId },
      });
      if (!year) {
        throw new BadRequestException('سال تحصیلی وجود ندارد');
      }
      academicYearId = dto.academicYearId;
    }

    if (dto.classGroupId && dto.classGroupId !== assignment.classGroupId) {
      const cls = await this.prisma.classGroup.findUnique({
        where: { id: dto.classGroupId },
      });
      if (!cls) {
        throw new BadRequestException('کلاس وجود ندارد');
      }
      if (cls.academicYearId !== academicYearId) {
        throw new BadRequestException(
          'کلاس انتخاب‌شده متعلق به سال تحصیلی فعلی نیست',
        );
      }
      classGroupId = dto.classGroupId;
    }

    if (dto.courseId && dto.courseId !== assignment.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) {
        throw new BadRequestException('درس وجود ندارد');
      }
      courseId = dto.courseId;
    }

    if (dto.mainTeacherId && dto.mainTeacherId !== assignment.mainTeacherId) {
      const main = await this.prisma.teacher.findUnique({
        where: { id: dto.mainTeacherId },
      });
      if (!main) {
        throw new BadRequestException('معلم اصلی وجود ندارد');
      }
    }

    if (
      dto.assistantTeacherId &&
      dto.assistantTeacherId !== assignment.assistantTeacherId
    ) {
      const assistant = await this.prisma.teacher.findUnique({
        where: { id: dto.assistantTeacherId },
      });
      if (!assistant) {
        throw new BadRequestException('معلم کمکی وجود ندارد');
      }
    }

    // چک یکتا بودن ترکیب جدید
    if (
      academicYearId !== assignment.academicYearId ||
      classGroupId !== assignment.classGroupId ||
      courseId !== assignment.courseId
    ) {
      const existing = await this.prisma.courseAssignment.findUnique({
        where: {
          UniqueClassCoursePerYear: {
            academicYearId,
            classGroupId,
            courseId,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          'برای این کلاس در این سال تحصیلی، این درس قبلاً ثبت شده است',
        );
      }
    }

    return this.prisma.courseAssignment.update({
      where: { id },
      data: {
        academicYearId,
        classGroupId,
        courseId,
        mainTeacherId: dto.mainTeacherId ?? assignment.mainTeacherId,
        assistantTeacherId:
          typeof dto.assistantTeacherId === 'string'
            ? dto.assistantTeacherId
            : assignment.assistantTeacherId,
        weeklyHours: dto.weeklyHours ?? assignment.weeklyHours,
      },
      include: {
        academicYear: true,
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
        course: true,
        mainTeacher: {
          include: { user: true },
        },
        assistantTeacher: {
          include: { user: true },
        },
      },
    });
  }

  async remove(id: number) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
      include: {
        scheduleSlots: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('انتساب پیدا نشد');
    }

    if (assignment.scheduleSlots.length > 0) {
      throw new BadRequestException(
        'امکان حذف انتسابی که برای آن برنامه هفتگی تعریف شده وجود ندارد',
      );
    }

    await this.prisma.courseAssignment.delete({
      where: { id },
    });

    return { success: true };
  }
}
