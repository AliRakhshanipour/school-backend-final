import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  AttendanceStatus,
  CourseType,
} from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { RecordWorkshopScoreDto } from './dto/record-workshop-score.dto';

@Injectable()
export class ClassSessionService {
  constructor(private readonly prisma: PrismaService) {}

  // ----- Helpers -----

  private async getTeacherByUserId(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });
    if (!teacher) {
      throw new ForbiddenException('فقط معلم‌ها به این بخش دسترسی دارند');
    }
    return teacher;
  }

  private async ensureTeacherIsMainForAssignment(
    teacherId: string,
    assignmentId: number,
  ) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: assignmentId },
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

  private async ensureSessionAndTeacherAccess(
    sessionId: number,
    userId: string,
  ) {
    const teacher = await this.getTeacherByUserId(userId);

    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        courseAssignment: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('جلسه پیدا نشد');
    }

    if (session.courseAssignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException(
        'فقط معلم اصلی می‌تواند این جلسه را مدیریت کند',
      );
    }

    if (session.isLocked) {
      throw new BadRequestException(
        'این جلسه قفل شده است و امکان ویرایش آن وجود ندارد',
      );
    }

    return { session, teacher, assignment: session.courseAssignment };
  }

  private async getEnrolledStudentsForAssignment(assignmentId: number) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('انتساب پیدا نشد');
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: assignment.academicYearId,
        classGroupId: assignment.classGroupId,
      },
      select: { studentId: true },
    });

    const allowedStudentIds = new Set(enrollments.map((e) => e.studentId));
    return { assignment, allowedStudentIds };
  }

  // ----- Session: Teacher side -----

  async createSessionForTeacher(
    userId: string,
    courseAssignmentId: number,
    dto: CreateSessionDto,
  ) {
    const teacher = await this.getTeacherByUserId(userId);
    const assignment = await this.ensureTeacherIsMainForAssignment(
      teacher.id,
      courseAssignmentId,
    );

    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('تاریخ جلسه نامعتبر است');
    }

    // چک اینکه تاریخ جلسه در بازه سال تحصیلی باشد
    const year = await this.prisma.academicYear.findUnique({
      where: { id: assignment.academicYearId },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی مرتبط پیدا نشد');
    }
    if (date < year.startDate || date > year.endDate) {
      throw new BadRequestException(
        'تاریخ جلسه خارج از بازه سال تحصیلی مربوطه است',
      );
    }

    let plannedScheduleSlotId: number | null = null;
    if (dto.plannedScheduleSlotId) {
      const slot = await this.prisma.weeklyScheduleSlot.findUnique({
        where: { id: dto.plannedScheduleSlotId },
      });
      if (!slot) {
        throw new BadRequestException('اسلات برنامه هفتگی پیدا نشد');
      }
      if (slot.courseAssignmentId !== assignment.id) {
        throw new BadRequestException(
          'اسلات انتخاب‌شده متعلق به این درس/کلاس نیست',
        );
      }
      plannedScheduleSlotId = slot.id;
    }

    const created = await this.prisma.courseSession.create({
      data: {
        academicYearId: assignment.academicYearId,
        classGroupId: assignment.classGroupId,
        courseAssignmentId: assignment.id,
        date,
        topic: dto.topic ?? null,
        plannedScheduleSlotId,
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

  async listSessionsForTeacher(
    userId: string,
    courseAssignmentId: number,
  ) {
    const teacher = await this.getTeacherByUserId(userId);
    await this.ensureTeacherIsMainForAssignment(
      teacher.id,
      courseAssignmentId,
    );

    return this.prisma.courseSession.findMany({
      where: { courseAssignmentId },
      orderBy: { date: 'desc' },
      include: {
        courseAssignment: {
          include: {
            course: true,
          },
        },
      },
    });
  }

  async getSessionDetailsForTeacher(userId: string, sessionId: number) {
    const teacher = await this.getTeacherByUserId(userId);
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: { fieldOfStudy: true, gradeLevel: true },
            },
          },
        },
        attendances: {
          include: {
            student: true,
          },
        },
        workshopScores: true,
      },
    });

    if (!session) {
      throw new NotFoundException('جلسه پیدا نشد');
    }

    if (session.courseAssignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException(
        'فقط معلم اصلی می‌تواند جزئیات این جلسه را ببیند',
      );
    }

    return session;
  }

  // ----- Attendance -----

  async recordAttendanceForSession(
    userId: string,
    sessionId: number,
    dto: RecordAttendanceDto,
  ) {
    const { session, teacher, assignment } =
      await this.ensureSessionAndTeacherAccess(sessionId, userId);

    const { allowedStudentIds } =
      await this.getEnrolledStudentsForAssignment(assignment.id);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('لیست حضور و غیاب خالی است');
    }

    // ولیدیشن بیزینسی روی هر آیتم
    for (const item of dto.items) {
      if (!allowedStudentIds.has(item.studentId)) {
        throw new BadRequestException(
          `هنرجو با شناسه ${item.studentId} در این کلاس/سال ثبت‌نام نشده است`,
        );
      }

      const status = item.status;

      const isLate = item.isLate ?? false;
      const lateMinutes = item.lateMinutes ?? 0;

      if (status === AttendanceStatus.ABSENT ||
          status === AttendanceStatus.EXCUSED) {
        if (isLate || lateMinutes > 0) {
          throw new BadRequestException(
            'برای هنرجوی غایب/غیبت موجه نباید تأخیر ثبت شود',
          );
        }
      }

      if (status === AttendanceStatus.PRESENT) {
        if (isLate && lateMinutes <= 0) {
          throw new BadRequestException(
            'برای هنرجوی حاضر با تأخیر، مقدار دقیقه تأخیر باید بیشتر از صفر باشد',
          );
        }
        if (!isLate && lateMinutes > 0) {
          throw new BadRequestException(
            'اگر تأخیر نداریم، lateMinutes باید صفر یا خالی باشد',
          );
        }
      }

      if (lateMinutes < 0) {
        throw new BadRequestException('تعداد دقیقه تأخیر نمی‌تواند منفی باشد');
      }
    }

    // Upsert برای هر هنرجو
    const operations = dto.items.map((item) =>
      this.prisma.studentAttendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: item.studentId,
          },
        },
        update: {
          status: item.status as AttendanceStatus,
          isLate: item.isLate ?? false,
          lateMinutes: item.lateMinutes ?? 0,
          note: item.note ?? null,
          markedByTeacherId: teacher.id,
        },
        create: {
          sessionId: session.id,
          studentId: item.studentId,
          status: item.status as AttendanceStatus,
          isLate: item.isLate ?? false,
          lateMinutes: item.lateMinutes ?? 0,
          note: item.note ?? null,
          markedByTeacherId: teacher.id,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    return {
      success: true,
      updatedCount: dto.items.length,
    };
  }

  // ----- Workshop Scores -----

  async recordWorkshopScoresForSession(
    userId: string,
    sessionId: number,
    dto: RecordWorkshopScoreDto,
  ) {
    const { session, teacher, assignment } =
      await this.ensureSessionAndTeacherAccess(sessionId, userId);

    // چک نوع درس: فقط WORKSHOP
    const course = await this.prisma.course.findUnique({
      where: { id: assignment.courseId },
    });
    if (!course) {
      throw new NotFoundException('درس مرتبط پیدا نشد');
    }
    if (course.type !== CourseType.WORKSHOP) {
      throw new BadRequestException(
        'ثبت نمره کارگاهی فقط برای دروس کارگاهی مجاز است',
      );
    }

    const { allowedStudentIds } =
      await this.getEnrolledStudentsForAssignment(assignment.id);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('لیست نمرات خالی است');
    }

    for (const item of dto.items) {
      if (!allowedStudentIds.has(item.studentId)) {
        throw new BadRequestException(
          `هنرجو با شناسه ${item.studentId} در این کلاس/سال ثبت‌نام نشده است`,
        );
      }

      const total =
        item.reportScore +
        item.disciplineScore +
        item.workPrecisionScore +
        item.circuitCorrectnessScore +
        item.questionsScore;

      if (total < 0 || total > 100) {
        throw new BadRequestException(
          `مجموع نمره هنرجو (${total}) باید بین ۰ و ۱۰۰ باشد`,
        );
      }
    }

    const operations = dto.items.map((item) => {
      const total =
        item.reportScore +
        item.disciplineScore +
        item.workPrecisionScore +
        item.circuitCorrectnessScore +
        item.questionsScore;

      return this.prisma.workshopScore.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: item.studentId,
          },
        },
        update: {
          reportScore: item.reportScore,
          disciplineScore: item.disciplineScore,
          workPrecisionScore: item.workPrecisionScore,
          circuitCorrectnessScore: item.circuitCorrectnessScore,
          questionsScore: item.questionsScore,
          totalScore: total,
        },
        create: {
          sessionId: session.id,
          studentId: item.studentId,
          reportScore: item.reportScore,
          disciplineScore: item.disciplineScore,
          workPrecisionScore: item.workPrecisionScore,
          circuitCorrectnessScore: item.circuitCorrectnessScore,
          questionsScore: item.questionsScore,
          totalScore: total,
        },
      });
    });

    await this.prisma.$transaction(operations);

    return {
      success: true,
      updatedCount: dto.items.length,
    };
  }

  // ----- Admin side -----

  async adminListSessionsByClass(
    classGroupId: number,
    academicYearId: number,
  ) {
    return this.prisma.courseSession.findMany({
      where: {
        classGroupId,
        academicYearId,
      },
      orderBy: { date: 'desc' },
      include: {
        courseAssignment: {
          include: {
            course: true,
            mainTeacher: { include: { user: true } },
          },
        },
      },
    });
  }

  async adminGetSessionDetails(sessionId: number) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        courseAssignment: {
          include: {
            course: true,
            mainTeacher: { include: { user: true } },
            classGroup: {
              include: {
                fieldOfStudy: true,
                gradeLevel: true,
              },
            },
          },
        },
        attendances: {
          include: {
            student: true,
          },
        },
        workshopScores: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('جلسه پیدا نشد');
    }

    return session;
  }

  async adminLockSession(sessionId: number) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('جلسه پیدا نشد');
    }

    if (session.isLocked) {
      return session;
    }

    return this.prisma.courseSession.update({
      where: { id: sessionId },
      data: {
        isLocked: true,
      },
    });
  }
}
