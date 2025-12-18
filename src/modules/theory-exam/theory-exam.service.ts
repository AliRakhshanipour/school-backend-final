import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamCategory, ExamMethod, ExamTerm, CourseType } from '@prisma/client';
import { CreateTheoryExamDto } from './dto/create-theory-exam.dto';
import { UpdateTheoryExamDto } from './dto/update-theory-exam.dto';
import { RecordTheoryExamResultsDto } from './dto/record-theory-exam-results.dto';

@Injectable()
export class TheoryExamService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Locks (برای جلوگیری از race condition) ----------
  private async lockTeacherRow(tx: any, teacherId: string) {
    await tx.$queryRaw`
      SELECT id FROM "Teacher"
      WHERE id = ${teacherId}
      FOR UPDATE
    `;
  }

  private async lockClassGroupRow(tx: any, classGroupId: number) {
    await tx.$queryRaw`
      SELECT id FROM "ClassGroup"
      WHERE id = ${classGroupId}
      FOR UPDATE
    `;
  }

  // ---------- Helpers ----------
  private async getTeacherByUserId(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      throw new ForbiddenException('فقط معلم‌ها به این بخش دسترسی دارند');
    }
    return teacher;
  }

  private async getTheoryAssignmentOrThrow(courseAssignmentId: number) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: courseAssignmentId },
      include: { course: true },
    });

    if (!assignment) throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    if (!assignment.course) throw new NotFoundException('درس مرتبط با این انتساب پیدا نشد');
    if (assignment.course.type !== CourseType.THEORY) {
      throw new BadRequestException('امتحان تئوری فقط برای درس‌های تئوری مجاز است');
    }

    return assignment;
  }

  private validateExamTimes(startAt: Date, endAt: Date, yearStart: Date, yearEnd: Date) {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('زمان شروع یا پایان امتحان نامعتبر است');
    }
    if (endAt <= startAt) {
      throw new BadRequestException('زمان پایان امتحان باید بعد از زمان شروع باشد');
    }
    if (startAt < yearStart || endAt > yearEnd) {
      throw new BadRequestException('زمان امتحان باید در بازه سال تحصیلی مربوطه باشد');
    }
  }

  /**
   * ✅ FIX حیاتی:
   * اگر mainTeacherId تهی/نال باشد، چک تداخل معلم را انجام نمی‌دهیم
   * (چون در غیر این صورت Prisma عملاً دنبال mainTeacherId=null می‌گردد و تداخلِ اشتباه می‌دهد)
   */
  private async assertNoExamConflictsTx(
    tx: any,
    academicYearId: number,
    classGroupId: number,
    startAt: Date,
    endAt: Date,
    mainTeacherId?: string | null,
    excludeExamId?: number,
  ) {
    const whereBase: any = {
      academicYearId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeExamId ? { id: { not: excludeExamId } } : {}),
    };

    // تداخل برای کلاس
    const classConflict = await tx.theoryExam.findFirst({
      where: { ...whereBase, classGroupId },
      select: { id: true },
    });
    if (classConflict) {
      throw new BadRequestException('برای این کلاس در این بازه زمانی امتحان دیگری ثبت شده است');
    }

    // تداخل برای معلم اصلی (در همه کلاس‌ها) - فقط اگر mainTeacherId معتبر باشد
    if (mainTeacherId) {
      const teacherConflict = await tx.theoryExam.findFirst({
        where: {
          ...whereBase,
          courseAssignment: { mainTeacherId },
        },
        select: { id: true },
      });
      if (teacherConflict) {
        throw new BadRequestException('برای این معلم در این بازه زمانی امتحان دیگری ثبت شده است');
      }
    }
  }

  private async getTeacherAndExamForTheory(userId: string, examId: number) {
    const teacher = await this.getTeacherByUserId(userId);

    const exam = await this.prisma.theoryExam.findUnique({
      where: { id: examId },
      include: {
        courseAssignment: { include: { course: true } },
      },
    });

    if (!exam) throw new NotFoundException('امتحان پیدا نشد');

    if (exam.courseAssignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException('فقط معلم اصلی این درس می‌تواند این امتحان را مدیریت کند');
    }

    if (exam.courseAssignment.course.type !== CourseType.THEORY) {
      throw new BadRequestException('این امتحان مربوط به درس تئوری نیست');
    }

    return { teacher, exam };
  }

  // ---------- Create Exams ----------

  async createExamByTeacher(userId: string, courseAssignmentId: number, dto: CreateTheoryExamDto) {
    const teacher = await this.getTeacherByUserId(userId);
    const assignment = await this.getTheoryAssignmentOrThrow(courseAssignmentId);

    if (assignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException('فقط معلم اصلی این درس می‌تواند این عملیات را انجام دهد');
    }

    const year = await this.prisma.academicYear.findUnique({ where: { id: assignment.academicYearId } });
    if (!year) throw new NotFoundException('سال تحصیلی مربوطه پیدا نشد');

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.validateExamTimes(startAt, endAt, year.startDate, year.endDate);

    const maxScore = dto.maxScore ?? 20;
    const weightPercent = dto.weightPercent ?? 100;
    const weight = weightPercent / 100;

    return this.prisma.$transaction(async (tx) => {
      await this.lockTeacherRow(tx, teacher.id);
      await this.lockClassGroupRow(tx, assignment.classGroupId);

      await this.assertNoExamConflictsTx(
        tx,
        assignment.academicYearId,
        assignment.classGroupId,
        startAt,
        endAt,
        assignment.mainTeacherId,
      );

      return tx.theoryExam.create({
        data: {
          academicYearId: assignment.academicYearId,
          classGroupId: assignment.classGroupId,
          courseAssignmentId: assignment.id,
          term: dto.term as ExamTerm,
          method: dto.method as any,
          category: dto.category as any,
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
              classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            },
          },
        },
      });
    });
  }

  async createExamByAdmin(courseAssignmentId: number, dto: CreateTheoryExamDto) {
    const assignment = await this.getTheoryAssignmentOrThrow(courseAssignmentId);

    const year = await this.prisma.academicYear.findUnique({ where: { id: assignment.academicYearId } });
    if (!year) throw new NotFoundException('سال تحصیلی مربوطه پیدا نشد');

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.validateExamTimes(startAt, endAt, year.startDate, year.endDate);

    const maxScore = dto.maxScore ?? 20;
    const weightPercent = dto.weightPercent ?? 100;
    const weight = weightPercent / 100;

    return this.prisma.$transaction(async (tx) => {
      // برای تداخل معلم هم lock می‌کنیم (اگر mainTeacherId وجود دارد)
      if (assignment.mainTeacherId) await this.lockTeacherRow(tx, assignment.mainTeacherId);
      await this.lockClassGroupRow(tx, assignment.classGroupId);

      await this.assertNoExamConflictsTx(
        tx,
        assignment.academicYearId,
        assignment.classGroupId,
        startAt,
        endAt,
        assignment.mainTeacherId,
      );

      return tx.theoryExam.create({
        data: {
          academicYearId: assignment.academicYearId,
          classGroupId: assignment.classGroupId,
          courseAssignmentId: assignment.id,
          term: dto.term as ExamTerm,
          method: dto.method as any,
          category: dto.category as any,
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
              classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            },
          },
        },
      });
    });
  }

  // ---------- Update / Lock ----------

  async updateExamByAdmin(examId: number, dto: UpdateTheoryExamDto) {
    const exam = await this.prisma.theoryExam.findUnique({
      where: { id: examId },
      include: { courseAssignment: true },
    });
    if (!exam) throw new NotFoundException('امتحان پیدا نشد');
    if (exam.isLocked) throw new BadRequestException('امتحان قفل شده است و امکان ویرایش آن وجود ندارد');

    const year = await this.prisma.academicYear.findUnique({ where: { id: exam.academicYearId } });
    if (!year) throw new NotFoundException('سال تحصیلی مربوطه پیدا نشد');

    const startAt = dto.startAt ? new Date(dto.startAt) : exam.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : exam.endAt;
    this.validateExamTimes(startAt, endAt, year.startDate, year.endDate);

    const maxScore = dto.maxScore ?? exam.maxScore;
    const weightPercent = dto.weightPercent ?? exam.weight * 100;
    const weight = weightPercent / 100;

    return this.prisma.$transaction(async (tx) => {
      if (exam.courseAssignment.mainTeacherId) await this.lockTeacherRow(tx, exam.courseAssignment.mainTeacherId);
      await this.lockClassGroupRow(tx, exam.classGroupId);

      await this.assertNoExamConflictsTx(
        tx,
        exam.academicYearId,
        exam.classGroupId,
        startAt,
        endAt,
        exam.courseAssignment.mainTeacherId,
        exam.id,
      );

      return tx.theoryExam.update({
        where: { id: examId },
        data: {
          term: (dto.term as ExamTerm) ?? exam.term,
          method: (dto.method as any) ?? exam.method,
          category: (dto.category as any) ?? exam.category,
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
              classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            },
          },
        },
      });
    });
  }

  async adminLockExam(examId: number) {
    const exam = await this.prisma.theoryExam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('امتحان پیدا نشد');
    if (exam.isLocked) return exam;

    return this.prisma.theoryExam.update({
      where: { id: examId },
      data: { isLocked: true },
    });
  }

  // ---------- Listing / Details ----------

  async listExamsForTeacher(userId: string, courseAssignmentId: number) {
    const teacher = await this.getTeacherByUserId(userId);
    const assignment = await this.prisma.courseAssignment.findUnique({ where: { id: courseAssignmentId } });
    if (!assignment) throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    if (assignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException('فقط معلم اصلی این درس می‌تواند لیست امتحان‌ها را ببیند');
    }

    return this.prisma.theoryExam.findMany({
      where: { courseAssignmentId },
      orderBy: { startAt: 'asc' },
      include: { courseAssignment: { include: { course: true } } },
    });
  }

  async getExamDetailsForTeacher(userId: string, examId: number) {
    await this.getTeacherAndExamForTheory(userId, examId);

    return this.prisma.theoryExam.findUnique({
      where: { id: examId },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
          },
        },
        results: {
          include: {
            student: true,
          },
        },
      },
    });
  }

  async adminListExams(filters: {
    academicYearId?: number;
    classGroupId?: number;
    term?: ExamTerm;
    courseAssignmentId?: number;
  }) {
    const where: any = {};
    if (typeof filters.academicYearId === 'number') where.academicYearId = filters.academicYearId;
    if (typeof filters.classGroupId === 'number') where.classGroupId = filters.classGroupId;
    if (filters.term) where.term = filters.term;
    if (typeof filters.courseAssignmentId === 'number') where.courseAssignmentId = filters.courseAssignmentId;

    return this.prisma.theoryExam.findMany({
      where,
      orderBy: [{ academicYearId: 'desc' }, { startAt: 'asc' }],
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
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
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
          },
        },
        results: {
          include: { student: true },
        },
      },
    });

    if (!exam) throw new NotFoundException('امتحان پیدا نشد');
    return exam;
  }

  // ---------- Results ----------

  async recordResultsForTeacher(userId: string, examId: number, dto: RecordTheoryExamResultsDto) {
    return this.prisma.$transaction(async (tx) => {
      const { teacher } = await this.getTeacherAndExamForTheory(userId, examId);

      // قفل روی خود امتحان
      const exam = await tx.theoryExam.findUnique({
        where: { id: examId },
        include: { courseAssignment: true },
      });
      if (!exam) throw new NotFoundException('امتحان پیدا نشد');
      if (exam.isLocked) {
        throw new BadRequestException('امتحان قفل شده است و امکان ویرایش نمرات وجود ندارد');
      }
      if (exam.courseAssignment.mainTeacherId !== teacher.id) {
        throw new ForbiddenException('فقط معلم اصلی این درس می‌تواند نمرات را ثبت کند');
      }

      // برای جلوگیری از race در ثبت نمرات/قفل، کلاس را هم lock می‌کنیم
      await this.lockTeacherRow(tx, teacher.id);
      await this.lockClassGroupRow(tx, exam.classGroupId);

      // جلوگیری از studentId تکراری
      const seen = new Set<string>();
      for (const it of dto.items) {
        if (seen.has(it.studentId)) {
          throw new BadRequestException('studentId تکراری در لیست نمرات ارسال شده است');
        }
        seen.add(it.studentId);
      }

      // دانش‌آموزهای مجاز (ثبت‌نام فعال در همان کلاس/سال)
      const enrollments = await tx.studentEnrollment.findMany({
        where: {
          academicYearId: exam.academicYearId,
          classGroupId: exam.classGroupId,
          isActive: true,
        },
        select: { studentId: true },
      });
      const allowed = new Set(enrollments.map((e: any) => e.studentId));

      await Promise.all(
        dto.items.map((it) => {
          if (!allowed.has(it.studentId)) {
            throw new BadRequestException('یکی از هنرجوها عضو این کلاس/سال تحصیلی نیست');
          }
          if (it.score < 0 || it.score > exam.maxScore) {
            throw new BadRequestException(`نمره باید بین 0 و ${exam.maxScore} باشد`);
          }

          return tx.theoryExamResult.upsert({
            where: {
              theoryExamId_studentId: {
                theoryExamId: exam.id,
                studentId: it.studentId,
              },
            },
            update: {
              score: it.score as any,
              note: it.note ?? null,
            },
            create: {
              theoryExamId: exam.id,
              studentId: it.studentId,
              score: it.score as any,
              note: it.note ?? null,
            },
          });
        }),
      );

      return tx.theoryExam.findUnique({
        where: { id: exam.id },
        include: {
          courseAssignment: { include: { course: true } },
          results: { include: { student: true } },
        },
      });
    });
  }
}
