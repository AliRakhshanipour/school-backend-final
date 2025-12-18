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

  // ✅ خروجی امن برای User (جلوگیری از لو رفتن password/refreshToken/...)
  private readonly safeUserSelect = {
    select: { id: true, username: true, role: true, createdAt: true },
  };

  private async getAssignmentDependenciesCounts(courseAssignmentId: number) {
    const [slots, sessions, exams] = await Promise.all([
      this.prisma.weeklyScheduleSlot.count({ where: { courseAssignmentId } }),
      this.prisma.courseSession.count({ where: { courseAssignmentId } }),
      this.prisma.theoryExam.count({ where: { courseAssignmentId } }),
    ]);
    return { slots, sessions, exams, total: slots + sessions + exams };
  }

  async create(dto: CreateCourseAssignmentDto) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) throw new BadRequestException('سال تحصیلی وجود ندارد');

    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id: dto.classGroupId },
    });
    if (!classGroup) throw new BadRequestException('کلاس انتخاب‌شده وجود ندارد');

    if (classGroup.academicYearId !== academicYear.id) {
      throw new BadRequestException('کلاس انتخاب‌شده متعلق به این سال تحصیلی نیست');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) throw new BadRequestException('درس انتخاب‌شده وجود ندارد');

    const mainTeacher = await this.prisma.teacher.findUnique({
      where: { id: dto.mainTeacherId },
    });
    if (!mainTeacher) throw new BadRequestException('معلم اصلی وجود ندارد');

    if (dto.assistantTeacherId) {
      if (dto.assistantTeacherId === dto.mainTeacherId) {
        throw new BadRequestException('معلم کمکی نمی‌تواند همان معلم اصلی باشد');
      }
      const assistant = await this.prisma.teacher.findUnique({
        where: { id: dto.assistantTeacherId },
      });
      if (!assistant) throw new BadRequestException('معلم کمکی وجود ندارد');
    }

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
        classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        course: true,
        mainTeacher: { include: { user: this.safeUserSelect } },
        assistantTeacher: { include: { user: this.safeUserSelect } },
      },
    });
  }

  async findAllByClass(classGroupId: number) {
    return this.prisma.courseAssignment.findMany({
      where: { classGroupId },
      include: {
        academicYear: true,
        classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        course: true,
        mainTeacher: { include: { user: this.safeUserSelect } },
        assistantTeacher: { include: { user: this.safeUserSelect } },
      },
    });
  }

  async findOne(id: number) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
      include: {
        academicYear: true,
        classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        course: true,
        mainTeacher: { include: { user: this.safeUserSelect } },
        assistantTeacher: { include: { user: this.safeUserSelect } },
        scheduleSlots: true,
      },
    });

    if (!assignment) throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    return assignment;
  }

  async update(id: number, dto: UpdateCourseAssignmentDto) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('انتساب پیدا نشد');

    let academicYearId = assignment.academicYearId;
    let classGroupId = assignment.classGroupId;
    let courseId = assignment.courseId;

    // --- اگر سال تحصیلی تغییر کند، باید کلاس فعلی هم متعلق به سال جدید باشد
    if (dto.academicYearId && dto.academicYearId !== assignment.academicYearId) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: dto.academicYearId },
      });
      if (!year) throw new BadRequestException('سال تحصیلی وجود ندارد');

      academicYearId = dto.academicYearId;

      if (!dto.classGroupId) {
        const currentClass = await this.prisma.classGroup.findUnique({
          where: { id: assignment.classGroupId },
        });
        if (!currentClass) throw new BadRequestException('کلاس وجود ندارد');
        if (currentClass.academicYearId !== academicYearId) {
          throw new BadRequestException('کلاس فعلی متعلق به سال تحصیلی جدید نیست');
        }
      }
    }

    if (dto.classGroupId && dto.classGroupId !== assignment.classGroupId) {
      const cls = await this.prisma.classGroup.findUnique({
        where: { id: dto.classGroupId },
      });
      if (!cls) throw new BadRequestException('کلاس وجود ندارد');
      if (cls.academicYearId !== academicYearId) {
        throw new BadRequestException('کلاس انتخاب‌شده متعلق به سال تحصیلی فعلی نیست');
      }
      classGroupId = dto.classGroupId;
    }

    if (dto.courseId && dto.courseId !== assignment.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) throw new BadRequestException('درس وجود ندارد');
      courseId = dto.courseId;
    }

    const nextMainTeacherId =
      typeof dto.mainTeacherId === 'string'
        ? dto.mainTeacherId
        : assignment.mainTeacherId;

    if (typeof dto.mainTeacherId === 'string' && dto.mainTeacherId !== assignment.mainTeacherId) {
      const main = await this.prisma.teacher.findUnique({
        where: { id: dto.mainTeacherId },
      });
      if (!main) throw new BadRequestException('معلم اصلی وجود ندارد');
    }

    // assistantTeacherId: اجازه‌ی clear با null
    if (dto.assistantTeacherId !== undefined && dto.assistantTeacherId !== assignment.assistantTeacherId) {
      if (dto.assistantTeacherId === null) {
        // ok (clear)
      } else {
        const assistant = await this.prisma.teacher.findUnique({
          where: { id: dto.assistantTeacherId as any },
        });
        if (!assistant) throw new BadRequestException('معلم کمکی وجود ندارد');
        if ((dto.assistantTeacherId as any) === nextMainTeacherId) {
          throw new BadRequestException('معلم کمکی نمی‌تواند همان معلم اصلی باشد');
        }
      }
    }

    // ✅ FIX حیاتی: اگر assignment وابستگی دارد، تغییر فیلدهای هویتی را ممنوع کنیم
    const identityChanged =
      academicYearId !== assignment.academicYearId ||
      classGroupId !== assignment.classGroupId ||
      courseId !== assignment.courseId;

    if (identityChanged) {
      const deps = await this.getAssignmentDependenciesCounts(id);
      if (deps.total > 0) {
        throw new BadRequestException(
          'این انتساب دارای برنامه/جلسه/امتحان ثبت‌شده است و تغییر سال/کلاس/درس باعث ناسازگاری داده‌ها می‌شود. برای تغییر، انتساب جدید بسازید.',
        );
      }
    }

    // چک یکتا بودن ترکیب جدید
    if (identityChanged) {
      const existing = await this.prisma.courseAssignment.findUnique({
        where: {
          UniqueClassCoursePerYear: { academicYearId, classGroupId, courseId },
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
        mainTeacherId: nextMainTeacherId,
        assistantTeacherId:
          dto.assistantTeacherId === undefined
            ? assignment.assistantTeacherId
            : (dto.assistantTeacherId as any) ?? null,
        weeklyHours: dto.weeklyHours ?? assignment.weeklyHours,
      },
      include: {
        academicYear: true,
        classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        course: true,
        mainTeacher: { include: { user: this.safeUserSelect } },
        assistantTeacher: { include: { user: this.safeUserSelect } },
      },
    });
  }

  async remove(id: number) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id },
      include: { scheduleSlots: true },
    });

    if (!assignment) throw new NotFoundException('انتساب پیدا نشد');

    // ✅ FIX حیاتی: فقط scheduleSlots کافی نیست (جلسه/امتحان هم مهم است)
    const deps = await this.getAssignmentDependenciesCounts(id);
    if (deps.total > 0) {
      throw new BadRequestException(
        'امکان حذف انتسابی که برای آن برنامه/جلسه/امتحان ثبت شده وجود ندارد',
      );
    }

    await this.prisma.courseAssignment.delete({ where: { id } });
    return { success: true };
  }

  async findAll() {
    return this.prisma.courseAssignment.findMany({
      include: {
        academicYear: true,
        classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        course: true,
        mainTeacher: { include: { user: this.safeUserSelect } },
        assistantTeacher: { include: { user: this.safeUserSelect } },
      },
    });
  }
}
