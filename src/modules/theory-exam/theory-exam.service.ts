import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  ExamTerm,
  ExamMethod,
  ExamCategory,
  CourseType,
} from '@prisma/client';
import { CreateTheoryExamDto } from './dto/create-theory-exam.dto';
import { UpdateTheoryExamDto } from './dto/update-theory-exam.dto';
import { RecordTheoryExamResultsDto } from './dto/record-theory-exam-results.dto';

@Injectable()
export class TheoryExamService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Helpers ----------

  private async getTeacherByUserId(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });
    if (!teacher) {
      throw new ForbiddenException('فقط معلم‌ها به این بخش دسترسی دارند');
    }
    return teacher;
  }

  private async ensureAssignmentExistsAndIsTheory(
    courseAssignmentId: number,
  ) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: courseAssignmentId },
      include: {
        course: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    }

    if (!assignment.course) {
      throw new NotFoundException('درس مرتبط با این انتساب پیدا نشد');
    }

    if (assignment.course.type !== CourseType.THEORY) {
      throw new BadRequestException(
        'امتحان تئوری فقط برای درس‌های تئوری مجاز است',
      );
    }

    return assignment;
  }

  private async ensureTeacherIsMainForAssignment(
    teacherId: string,
    courseAssignmentId: number,
  ) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: courseAssignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    }

    if (assignment.mainTeacherId !== teacherId) {
      throw new ForbiddenException(
        'فقط معلم اصلی این درس می‌تواند این عملیات را انجام دهد',
      );
    }

    return assignment;
  }

  private validateExamTimes(
    startAt: Date,
    endAt: Date,
    yearStart: Date,
    yearEnd: Date,
  ) {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('زمان شروع یا پایان امتحان نامعتبر است');
    }

    if (endAt <= startAt) {
      throw new BadRequestException(
        'زمان پایان امتحان باید بعد از زمان شروع باشد',
      );
    }

    if (startAt < yearStart || endAt > yearEnd) {
      throw new BadRequestException(
        'زمان امتحان باید در بازه سال تحصیلی مربوطه باشد',
      );
    }
  }

  private async assertNoExamConflicts(
    academicYearId: number,
    classGroupId: number,
    courseAssignmentId: number,
    startAt: Date,
    endAt: Date,
    mainTeacherId: string,
    excludeExamId?: number,
  ) {
    const whereBase: any = {
      academicYearId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    };

    if (excludeExamId) {
      whereBase.id = { not: excludeExamId };
    }

    // تداخل برای کلاس
    const classConflict = await this.prisma.theoryExam.findFirst({
      where: {
        ...whereBase,
        classGroupId,
      },
    });

    if (classConflict) {
      throw new BadRequestException(
        'برای این کلاس در این بازه زمانی امتحان دیگری ثبت شده است',
      );
    }

    // تداخل برای معلم اصلی (روی courseAssignment→mainTeacherId)
    const teacherConflict = await this.prisma.theoryExam.findFirst({
      where: {
        ...whereBase,
        courseAssignment: {
          mainTeacherId,
        },
      },
      include: {
        courseAssignment: true,
      },
    });

    if (teacherConflict) {
      throw new BadRequestException(
        'برای این معلم در این بازه زمانی امتحان دیگری ثبت شده است',
      );
    }
  }

  private async getEnrolledStudentsForAssignment(assignmentId: number) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: assignment.academicYearId,
        classGroupId: assignment.classGroupId,
      },
      select: { studentId: true },
    });

    return {
      assignment,
      allowedStudentIds: new Set(enrollments.map((e) => e.studentId)),
    };
  }

  private async ensureTeacherAccessToExam(userId: string, examId: number) {
    const teacher = await this.getTeacherByUserId(userId);
    const exam = await this.prisma.theoryExam.findUnique({
      where: { id: examId },
      include: {
        courseAssignment: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('امتحان پیدا نشد');
    }

    if (exam.courseAssignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException(
        'فقط معلم اصلی این درس می‌تواند این امتحان را مدیریت کند',
      );
    }

    if (exam.isLocked) {
      throw new BadRequestException(
        'امتحان قفل شده است و امکان ویرایش آن وجود ندارد',
      );
    }

    if (exam.courseAssignment.course.type !== CourseType.THEORY) {
      throw new BadRequestException(
        'این امتحان مربوط به درس تئوری نیست و قابل مدیریت از این مسیر نیست',
      );
    }

    return { teacher, exam };
  }

  // ---------- Create / Update Exams ----------

  async createExamByTeacher(
    userId: string,
    courseAssignmentId: number,
    dto: CreateTheoryExamDto,
  ) {
    const teacher = await this.getTeacherByUserId(userId);
    const assignment = await this.ensureTeacherIsMainForAssignment(
      teacher.id,
      courseAssignmentId,
    );

    const fullAssignment = await this.ensureAssignmentExistsAndIsTheory(
      courseAssignmentId,
    );

    const year = await this.prisma.academicYear.findUnique({
      where: { id: assignment.academicYearId },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مربوطه پیدا نشد');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.validateExamTimes(startAt, endAt, year.startDate, year.endDate);

    const maxScore = dto.maxScore ?? 20;
    const weightPercent = dto.weightPercent ?? 100;
    const weight = weightPercent / 100;

    await this.assertNoExamConflicts(
      assignment.academicYearId,
      assignment.classGroupId,
      assignment.id,
      startAt,
      endAt,
      assignment.mainTeacherId,
    );

    const created = await this.prisma.theoryExam.create({
      data: {
        academicYearId: assignment.academicYearId,
        classGroupId: assignment.classGroupId,
        courseAssignmentId: assignment.id,
        term: dto.term as ExamTerm,
        method: dto.method as ExamMethod,
        category: dto.category as ExamCategory,
        title: dto.title ?? null,
        description: dto.description ?? null,
        startAt,
        endAt,
        maxScore,
        weight,
        createdByTeacherId: teacher.id,
      },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: { fieldOfStudy: true, gradeLevel: true },
            },
          },
        },
      },
    });

    return created;
  }

  async createExamByAdmin(
    courseAssignmentId: number,
    dto: CreateTheoryExamDto,
  ) {
    const assignment = await this.ensureAssignmentExistsAndIsTheory(
      courseAssignmentId,
    );

    const year = await this.prisma.academicYear.findUnique({
      where: { id: assignment.academicYearId },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مربوطه پیدا نشد');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.validateExamTimes(startAt, endAt, year.startDate, year.endDate);

    const maxScore = dto.maxScore ?? 20;
    const weightPercent = dto.weightPercent ?? 100;
    const weight = weightPercent / 100;

    await this.assertNoExamConflicts(
      assignment.academicYearId,
      assignment.classGroupId,
      assignment.id,
      startAt,
      endAt,
      assignment.mainTeacherId,
    );

    const created = await this.prisma.theoryExam.create({
      data: {
        academicYearId: assignment.academicYearId,
        classGroupId: assignment.classGroupId,
        courseAssignmentId: assignment.id,
        term: dto.term as ExamTerm,
        method: dto.method as ExamMethod,
        category: dto.category as ExamCategory,
        title: dto.title ?? null,
        description: dto.description ?? null,
        startAt,
        endAt,
        maxScore,
        weight,
        createdByTeacherId: null,
      },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: { fieldOfStudy: true, gradeLevel: true },
            },
          },
        },
      },
    });

    return created;
  }

  async updateExamByAdmin(examId: number, dto: UpdateTheoryExamDto) {
    const exam = await this.prisma.theoryExam.findUnique({
      where: { id: examId },
      include: {
        courseAssignment: true,
      },
    });
    if (!exam) {
      throw new NotFoundException('امتحان پیدا نشد');
    }

    if (exam.isLocked) {
      throw new BadRequestException(
        'امتحان قفل شده است و امکان ویرایش آن وجود ندارد',
      );
    }

    const year = await this.prisma.academicYear.findUnique({
      where: { id: exam.academicYearId },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مربوطه پیدا نشد');
    }

    const startAt = dto.startAt
      ? new Date(dto.startAt)
      : exam.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : exam.endAt;

    this.validateExamTimes(startAt, endAt, year.startDate, year.endDate);

    const maxScore = dto.maxScore ?? exam.maxScore;
    const weightPercent = dto.weightPercent
      ? dto.weightPercent
      : exam.weight * 100;
    const weight = weightPercent / 100;

    await this.assertNoExamConflicts(
      exam.academicYearId,
      exam.classGroupId,
      exam.courseAssignmentId,
      startAt,
      endAt,
      exam.courseAssignment.mainTeacherId,
      exam.id,
    );

    const updated = await this.prisma.theoryExam.update({
      where: { id: examId },
      data: {
        term: (dto.term as ExamTerm) ?? exam.term,
        method: (dto.method as ExamMethod) ?? exam.method,
        category: (dto.category as ExamCategory) ?? exam.category,
        title: dto.title ?? exam.title,
        description: dto.description ?? exam.description,
        startAt,
        endAt,
        maxScore,
        weight,
      },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: { fieldOfStudy: true, gradeLevel: true },
            },
          },
        },
      },
    });

    return updated;
  }

  // ---------- Listing / Details ----------

  async listExamsForTeacher(
    userId: string,
    courseAssignmentId: number,
  ) {
    const teacher = await this.getTeacherByUserId(userId);
    await this.ensureTeacherIsMainForAssignment(
      teacher.id,
      courseAssignmentId,
    );

    return this.prisma.theoryExam.findMany({
      where: {
        courseAssignmentId,
      },
      orderBy: { startAt: 'asc' },
      include: {
        courseAssignment: {
          include: { course: true },
        },
      },
    });
  }

  async getExamDetailsForTeacher(userId: string, examId: number) {
    const { teacher, exam } = await this.ensureTeacherAccessToExam(
      userId,
      examId,
    );

    const full = await this.prisma.theoryExam.findUnique({
      where: { id: exam.id },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: { fieldOfStudy: true, gradeLevel: true },
            },
          },
        },
        results: {
          include: {
            student: true,
          },
        },
      },
    });

    return full;
  }

  async adminListExams(filters: {
    academicYearId?: number;
    classGroupId?: number;
    term?: ExamTerm;
    courseAssignmentId?: number;
  }) {
    const where: any = {};

    if (typeof filters.academicYearId === 'number') {
      where.academicYearId = filters.academicYearId;
    }

    if (typeof filters.classGroupId === 'number') {
      where.classGroupId = filters.classGroupId;
    }

    if (filters.term) {
      where.term = filters.term;
    }

    if (typeof filters.courseAssignmentId === 'number') {
      where.courseAssignmentId = filters.courseAssignmentId;
    }

    return this.prisma.theoryExam.findMany({
      where,
      orderBy: [
        { academicYearId: 'desc' },
        { startAt: 'asc' },
      ],
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: { fieldOfStudy: true, gradeLevel: true },
            },
          },
        },
      },
    });
  }

  async adminGetExamDetails(examId: number) {
    const exam = await this.prisma.theoryExam.findUnique({
      where: { id: examId },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: { fieldOfStudy: true, gradeLevel: true },
            },
          },
        },
        results: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('امتحان پیدا نشد');
    }

    return exam;
  }

  async adminLockExam(examId: number) {
    const exam = await this.prisma.theoryExam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('امتحان پیدا نشد');
    }

    if (exam.isLocked) {
      return exam;
    }

    return this.prisma.theoryExam.update({
      where: { id: examId },
      data: {
        isLocked: true,
      },
    });
  }

  // ---------- Results ----------

  async recordResultsForTeacher(
    userId: string,
    examId: number,
    dto: RecordTheoryExamResultsDto,
  ) {
    const { teacher, exam } = await this.ensureTeacherAccessToExam(
      userId,
      examId,
    );

    const { assignment, allowedStudentIds } =
      await this.getEnrolledStudentsForAssignment(exam.courseAssignmentId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('لیست نمرات خالی است');
    }

    for (const item of dto.items) {
      if (!allowedStudentIds.has(item.studentId)) {
        throw new BadRequestException(
          `هنرجو با شناسه ${item.studentId} در این کلاس/سال ثبت‌نام نشده است`,
        );
      }

      if (item.score < 0 || item.score > exam.maxScore) {
        throw new BadRequestException(
          `نمره هنرجو (${item.score}) باید بین ۰ و ${exam.maxScore} باشد`,
        );
      }
    }

    const ops = dto.items.map((item) =>
      this.prisma.theoryExamResult.upsert({
        where: {
          theoryExamId_studentId: {
            theoryExamId: exam.id,
            studentId: item.studentId,
          },
        },
        update: {
          score: item.score.toFixed(1),
          note: item.note ?? null,
        },
        create: {
          theoryExamId: exam.id,
          studentId: item.studentId,
          score: item.score.toFixed(1),
          note: item.note ?? null,
        },
      }),
    );

    await this.prisma.$transaction(ops);

    return {
      success: true,
      updatedCount: dto.items.length,
    };
  }
}
