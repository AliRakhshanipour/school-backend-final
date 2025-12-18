import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { CreateCourseSessionDto } from './dto/create-course-session.dto';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto';
import { RecordSessionAttendancesDto } from './dto/record-session-attendances.dto';
import { CreateTeacherAttendanceDto } from './dto/create-teacher-attendance.dto';
import { UpdateTeacherAttendanceDto } from './dto/update-teacher-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Helpers ----------
  private parseIsoDate(value: string, fieldName: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${fieldName} نامعتبر است`);
    }
    return d;
  }

  private assertNoDuplicateStudentIds(items: { studentId: string }[]) {
    const set = new Set<string>();
    for (const it of items) {
      if (set.has(it.studentId)) {
        throw new BadRequestException('studentId تکراری در لیست ارسالی وجود دارد');
      }
      set.add(it.studentId);
    }
  }

  private async getTeacherByUserId(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new ForbiddenException('فقط معلم‌ها به این بخش دسترسی دارند');
    return teacher;
  }

  private async ensureTeacherIsMainForAssignment(teacherId: string, assignmentId: number) {
    const a = await this.prisma.courseAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        classGroup: true,
        course: true,
        academicYear: true,
      },
    });
    if (!a) throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    if (a.mainTeacherId !== teacherId) {
      throw new ForbiddenException('فقط معلم اصلی این درس می‌تواند حضور و غیاب را ثبت کند');
    }
    if (!a.academicYear) throw new BadRequestException('سال تحصیلی این انتساب نامشخص است');
    return a;
  }

  private async getSessionOrThrow(sessionId: number) {
    const s = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
          },
        },
      },
    });
    if (!s) throw new NotFoundException('جلسه پیدا نشد');
    return s;
  }

  private async getAllowedStudentIds(academicYearId: number, classGroupId: number) {
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { academicYearId, classGroupId, isActive: true },
      select: { studentId: true },
    });
    return new Set(enrollments.map(e => e.studentId));
  }

  private async lockSessionRow(tx: any, sessionId: number) {
    await tx.$queryRaw`
      SELECT id FROM "CourseSession"
      WHERE id = ${sessionId}
      FOR UPDATE
    `;
  }

  private normalizeLate(isLate?: boolean, lateMinutes?: number) {
    const late = !!isLate;
    const mins = late ? Math.max(0, lateMinutes ?? 0) : 0;
    return { isLate: late, lateMinutes: mins };
  }

  private ensureDateWithinAcademicYear(sessionDate: Date, yearStart: Date, yearEnd: Date) {
    if (sessionDate < yearStart || sessionDate > yearEnd) {
      throw new BadRequestException('تاریخ جلسه باید در بازه سال تحصیلی باشد');
    }
  }

  // ---------- Teacher: list own assignments ----------
  async teacherListMyAssignments(userId: string, academicYearId?: number) {
    const teacher = await this.getTeacherByUserId(userId);

    return this.prisma.courseAssignment.findMany({
      where: {
        mainTeacherId: teacher.id,
        ...(typeof academicYearId === 'number' ? { academicYearId } : {}),
      },
      orderBy: [{ academicYearId: 'desc' }, { classGroupId: 'asc' }],
      include: {
        academicYear: true,
        classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        course: true,
      },
    });
  }

  // ---------- Sessions (Teacher/Admin create) ----------
  async createSessionByTeacher(userId: string, assignmentId: number, dto: CreateCourseSessionDto) {
    const teacher = await this.getTeacherByUserId(userId);
    const assignment = await this.ensureTeacherIsMainForAssignment(teacher.id, assignmentId);

    const date = this.parseIsoDate(dto.date, 'date');
    this.ensureDateWithinAcademicYear(date, assignment.academicYear.startDate, assignment.academicYear.endDate);

    return this.prisma.$transaction(async (tx) => {
      if (dto.plannedScheduleSlotId) {
        const slot = await tx.weeklyScheduleSlot.findUnique({ where: { id: dto.plannedScheduleSlotId } });
        if (!slot) throw new BadRequestException('اسلات برنامه هفتگی پیدا نشد');
        if (slot.courseAssignmentId !== assignment.id) throw new BadRequestException('اسلات مربوط به این درس/کلاس نیست');
      }

      const session = await tx.courseSession.create({
        data: {
          academicYearId: assignment.academicYearId,
          classGroupId: assignment.classGroupId,
          courseAssignmentId: assignment.id,
          plannedScheduleSlotId: dto.plannedScheduleSlotId ?? null,
          date,
          topic: dto.topic ?? null,
          isLocked: false,
        },
      });

      const auto = dto.autoFillAttendances ?? true;
      if (auto) {
        const allowed = await tx.studentEnrollment.findMany({
          where: {
            academicYearId: assignment.academicYearId,
            classGroupId: assignment.classGroupId,
            isActive: true,
          },
          select: { studentId: true },
        });

        const defaultStatus = dto.defaultStatus ?? AttendanceStatus.PRESENT;

        if (allowed.length > 0) {
          await tx.studentAttendance.createMany({
            data: allowed.map(s => ({
              sessionId: session.id,
              studentId: s.studentId,
              status: defaultStatus,
              isLate: false,
              lateMinutes: 0,
              note: null,
              markedByUserId: userId,
              markedByTeacherId: teacher.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.courseSession.findUnique({
        where: { id: session.id },
        include: {
          courseAssignment: {
            include: {
              course: true,
              classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
              mainTeacher: { include: { user: true } },
              assistantTeacher: { include: { user: true } },
            },
          },
          attendances: {
            include: { student: true, markedByUser: true, markedByTeacher: true },
            orderBy: { studentId: 'asc' },
          },
        },
      });
    });
  }

  async createSessionByAdmin(adminUserId: string, assignmentId: number, dto: CreateCourseSessionDto) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: assignmentId },
      include: { academicYear: true },
    });
    if (!assignment) throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    if (!assignment.academicYear) throw new BadRequestException('سال تحصیلی این انتساب نامشخص است');

    const date = this.parseIsoDate(dto.date, 'date');
    this.ensureDateWithinAcademicYear(date, assignment.academicYear.startDate, assignment.academicYear.endDate);

    return this.prisma.$transaction(async (tx) => {
      if (dto.plannedScheduleSlotId) {
        const slot = await tx.weeklyScheduleSlot.findUnique({ where: { id: dto.plannedScheduleSlotId } });
        if (!slot) throw new BadRequestException('اسلات برنامه هفتگی پیدا نشد');
        if (slot.courseAssignmentId !== assignment.id) throw new BadRequestException('اسلات مربوط به این درس/کلاس نیست');
      }

      const session = await tx.courseSession.create({
        data: {
          academicYearId: assignment.academicYearId,
          classGroupId: assignment.classGroupId,
          courseAssignmentId: assignment.id,
          plannedScheduleSlotId: dto.plannedScheduleSlotId ?? null,
          date,
          topic: dto.topic ?? null,
          isLocked: false,
        },
      });

      const auto = dto.autoFillAttendances ?? true;
      if (auto) {
        const allowed = await tx.studentEnrollment.findMany({
          where: {
            academicYearId: assignment.academicYearId,
            classGroupId: assignment.classGroupId,
            isActive: true,
          },
          select: { studentId: true },
        });

        const defaultStatus = dto.defaultStatus ?? AttendanceStatus.PRESENT;

        if (allowed.length > 0) {
          await tx.studentAttendance.createMany({
            data: allowed.map(s => ({
              sessionId: session.id,
              studentId: s.studentId,
              status: defaultStatus,
              isLate: false,
              lateMinutes: 0,
              note: null,
              markedByUserId: adminUserId,
              markedByTeacherId: null,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.courseSession.findUnique({
        where: { id: session.id },
        include: {
          courseAssignment: {
            include: {
              course: true,
              classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
              mainTeacher: { include: { user: true } },
              assistantTeacher: { include: { user: true } },
            },
          },
          attendances: {
            include: { student: true, markedByUser: true, markedByTeacher: true },
            orderBy: { studentId: 'asc' },
          },
        },
      });
    });
  }

  async listSessionsForTeacher(userId: string, assignmentId: number) {
    const teacher = await this.getTeacherByUserId(userId);
    await this.ensureTeacherIsMainForAssignment(teacher.id, assignmentId);

    return this.prisma.courseSession.findMany({
      where: { courseAssignmentId: assignmentId },
      orderBy: { date: 'desc' },
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

  async getSessionDetailsForTeacher(userId: string, sessionId: number) {
    const teacher = await this.getTeacherByUserId(userId);
    const session = await this.getSessionOrThrow(sessionId);

    if (session.courseAssignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException('این جلسه مربوط به کلاس‌های شما نیست');
    }

    return this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            mainTeacher: { include: { user: true } },
            assistantTeacher: { include: { user: true } },
          },
        },
        attendances: {
          include: { student: true, markedByUser: true, markedByTeacher: true },
          orderBy: { studentId: 'asc' },
        },
      },
    });
  }

  // ---------- Record attendances ----------
  async recordAttendancesAsTeacher(userId: string, sessionId: number, dto: RecordSessionAttendancesDto) {
    const teacher = await this.getTeacherByUserId(userId);

    if (!dto.items?.length) throw new BadRequestException('لیست حضور و غیاب خالی است');
    this.assertNoDuplicateStudentIds(dto.items);

    return this.prisma.$transaction(async (tx) => {
      await this.lockSessionRow(tx, sessionId);

      const session = await tx.courseSession.findUnique({
        where: { id: sessionId },
        include: { courseAssignment: true },
      });
      if (!session) throw new NotFoundException('جلسه پیدا نشد');

      if (session.isLocked) {
        throw new BadRequestException('جلسه قفل شده است و امکان ثبت/ویرایش حضور و غیاب وجود ندارد');
      }

      if (session.courseAssignment.mainTeacherId !== teacher.id) {
        throw new ForbiddenException('فقط معلم اصلی این درس می‌تواند حضور و غیاب را ثبت کند');
      }

      const allowedIds = await this.getAllowedStudentIds(session.academicYearId, session.classGroupId);

      for (const it of dto.items) {
        if (!allowedIds.has(it.studentId)) {
          throw new BadRequestException('یک یا چند هنرجو متعلق به این کلاس/سال تحصیلی نیستند');
        }
      }

      for (const it of dto.items) {
        const { isLate, lateMinutes } = this.normalizeLate(it.isLate, it.lateMinutes);

        await tx.studentAttendance.upsert({
          where: { sessionId_studentId: { sessionId, studentId: it.studentId } },
          update: {
            status: it.status,
            isLate,
            lateMinutes,
            note: it.note ?? null,
            markedByUserId: userId,
            markedByTeacherId: teacher.id,
          },
          create: {
            sessionId,
            studentId: it.studentId,
            status: it.status,
            isLate,
            lateMinutes,
            note: it.note ?? null,
            markedByUserId: userId,
            markedByTeacherId: teacher.id,
          },
        });
      }

      return tx.courseSession.findUnique({
        where: { id: sessionId },
        include: {
          attendances: {
            include: { student: true, markedByUser: true, markedByTeacher: true },
            orderBy: { studentId: 'asc' },
          },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async recordAttendancesAsAdmin(adminUserId: string, sessionId: number, dto: RecordSessionAttendancesDto) {
    if (!dto.items?.length) throw new BadRequestException('لیست حضور و غیاب خالی است');
    this.assertNoDuplicateStudentIds(dto.items);

    return this.prisma.$transaction(async (tx) => {
      await this.lockSessionRow(tx, sessionId);

      const session = await tx.courseSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new NotFoundException('جلسه پیدا نشد');

      if (session.isLocked) {
        throw new BadRequestException('جلسه قفل شده است. ابتدا آن را باز کنید سپس ویرایش کنید');
      }

      const allowedIds = await this.getAllowedStudentIds(session.academicYearId, session.classGroupId);

      for (const it of dto.items) {
        if (!allowedIds.has(it.studentId)) {
          throw new BadRequestException('یک یا چند هنرجو متعلق به این کلاس/سال تحصیلی نیستند');
        }
      }

      for (const it of dto.items) {
        const { isLate, lateMinutes } = this.normalizeLate(it.isLate, it.lateMinutes);

        await tx.studentAttendance.upsert({
          where: { sessionId_studentId: { sessionId, studentId: it.studentId } },
          update: {
            status: it.status,
            isLate,
            lateMinutes,
            note: it.note ?? null,
            markedByUserId: adminUserId,
            markedByTeacherId: null,
          },
          create: {
            sessionId,
            studentId: it.studentId,
            status: it.status,
            isLate,
            lateMinutes,
            note: it.note ?? null,
            markedByUserId: adminUserId,
            markedByTeacherId: null,
          },
        });
      }

      return tx.courseSession.findUnique({
        where: { id: sessionId },
        include: {
          attendances: {
            include: { student: true, markedByUser: true, markedByTeacher: true },
            orderBy: { studentId: 'asc' },
          },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ---------- Lock / Unlock ----------
  async teacherLockSession(userId: string, sessionId: number) {
    const teacher = await this.getTeacherByUserId(userId);
    const session = await this.getSessionOrThrow(sessionId);

    if (session.courseAssignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException('این جلسه مربوط به کلاس‌های شما نیست');
    }

    return this.prisma.courseSession.update({
      where: { id: sessionId },
      data: { isLocked: true },
    });
  }

  async adminSetLock(sessionId: number, isLocked: boolean) {
    const s = await this.prisma.courseSession.findUnique({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('جلسه پیدا نشد');

    return this.prisma.courseSession.update({
      where: { id: sessionId },
      data: { isLocked },
    });
  }

  async adminUpdateSession(sessionId: number, dto: UpdateCourseSessionDto) {
    const s = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: { courseAssignment: { include: { academicYear: true } } },
    });
    if (!s) throw new NotFoundException('جلسه پیدا نشد');
    if (s.isLocked) throw new BadRequestException('جلسه قفل است. ابتدا unlock کنید');

    const nextDate = dto.date ? this.parseIsoDate(dto.date, 'date') : s.date;

    // چک بازه سال تحصیلی
    const year = s.courseAssignment?.academicYear;
    if (year) this.ensureDateWithinAcademicYear(nextDate, year.startDate, year.endDate);

    return this.prisma.courseSession.update({
      where: { id: sessionId },
      data: {
        date: nextDate,
        topic: dto.topic !== undefined ? (dto.topic ?? null) : s.topic,
        plannedScheduleSlotId:
          dto.plannedScheduleSlotId !== undefined
            ? (dto.plannedScheduleSlotId ?? null)
            : s.plannedScheduleSlotId,
      },
    });
  }

  // ---------- Admin: list sessions ----------
  async adminListSessions(filters: {
    academicYearId?: number;
    classGroupId?: number;
    courseAssignmentId?: number;
    from?: string;
    to?: string;
  }) {
    const where: Prisma.CourseSessionWhereInput = {};

    if (typeof filters.academicYearId === 'number') where.academicYearId = filters.academicYearId;
    if (typeof filters.classGroupId === 'number') where.classGroupId = filters.classGroupId;
    if (typeof filters.courseAssignmentId === 'number') where.courseAssignmentId = filters.courseAssignmentId;

    if (filters.from || filters.to) {
      const from = filters.from ? this.parseIsoDate(filters.from, 'from') : undefined;
      const to = filters.to ? this.parseIsoDate(filters.to, 'to') : undefined;
      if (from && to && to < from) throw new BadRequestException('بازه تاریخ نامعتبر است');

      where.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    return this.prisma.courseSession.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            mainTeacher: { include: { user: true } },
          },
        },
      },
    });
  }

  async adminGetSessionDetails(sessionId: number) {
    const s = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            mainTeacher: { include: { user: true } },
            assistantTeacher: { include: { user: true } },
          },
        },
        attendances: {
          include: { student: true, markedByUser: true, markedByTeacher: true },
          orderBy: { studentId: 'asc' },
        },
      },
    });
    if (!s) throw new NotFoundException('جلسه پیدا نشد');
    return s;
  }

  // ---------- Teacher Attendance (Admin) ----------
  async adminUpsertTeacherAttendance(adminUserId: string, teacherId: string, dto: CreateTeacherAttendanceDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new NotFoundException('معلم پیدا نشد');

    if (dto.academicYearId) {
      const year = await this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
      if (!year) throw new BadRequestException('سال تحصیلی وجود ندارد');
    }

    const day = this.parseIsoDate(dto.date, 'date');
    const { isLate, lateMinutes } = this.normalizeLate(dto.isLate, dto.lateMinutes);

    return this.prisma.teacherAttendance.upsert({
      where: { teacherId_date: { teacherId, date: day as any } },
      update: {
        academicYearId: dto.academicYearId ?? null,
        status: dto.status,
        isLate,
        lateMinutes,
        note: dto.note ?? null,
        recordedByUserId: adminUserId,
      },
      create: {
        teacherId,
        academicYearId: dto.academicYearId ?? null,
        date: day as any,
        status: dto.status,
        isLate,
        lateMinutes,
        note: dto.note ?? null,
        recordedByUserId: adminUserId,
      },
      include: {
        teacher: { include: { user: true } },
        recordedByUser: true,
        academicYear: true,
      },
    });
  }

  async adminListTeacherAttendance(filters: { teacherId?: string; academicYearId?: number; from?: string; to?: string }) {
    const where: Prisma.TeacherAttendanceWhereInput = {};

    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (typeof filters.academicYearId === 'number') where.academicYearId = filters.academicYearId;

    if (filters.from || filters.to) {
      const from = filters.from ? this.parseIsoDate(filters.from, 'from') : undefined;
      const to = filters.to ? this.parseIsoDate(filters.to, 'to') : undefined;
      if (from && to && to < from) throw new BadRequestException('بازه تاریخ نامعتبر است');

      where.date = {
        ...(from ? { gte: from as any } : {}),
        ...(to ? { lte: to as any } : {}),
      };
    }

    return this.prisma.teacherAttendance.findMany({
      where,
      orderBy: [{ date: 'desc' }],
      include: {
        teacher: { include: { user: true } },
        recordedByUser: true,
        academicYear: true,
      },
    });
  }

  async adminUpdateTeacherAttendance(recordId: number, dto: UpdateTeacherAttendanceDto) {
    const rec = await this.prisma.teacherAttendance.findUnique({ where: { id: recordId } });
    if (!rec) throw new NotFoundException('رکورد حضور و غیاب معلم پیدا نشد');

    if (dto.academicYearId) {
      const year = await this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
      if (!year) throw new BadRequestException('سال تحصیلی وجود ندارد');
    }

    const day = dto.date ? (this.parseIsoDate(dto.date, 'date') as any) : rec.date;
    const { isLate, lateMinutes } = this.normalizeLate(
      dto.isLate ?? rec.isLate,
      dto.lateMinutes ?? rec.lateMinutes,
    );

    return this.prisma.teacherAttendance.update({
      where: { id: recordId },
      data: {
        date: day,
        academicYearId: dto.academicYearId !== undefined ? (dto.academicYearId ?? null) : rec.academicYearId,
        status: dto.status ?? rec.status,
        isLate,
        lateMinutes,
        note: dto.note !== undefined ? (dto.note ?? null) : rec.note,
      },
      include: {
        teacher: { include: { user: true } },
        recordedByUser: true,
        academicYear: true,
      },
    });
  }

  async adminDeleteTeacherAttendance(recordId: number) {
    const rec = await this.prisma.teacherAttendance.findUnique({ where: { id: recordId } });
    if (!rec) throw new NotFoundException('رکورد حضور و غیاب معلم پیدا نشد');

    await this.prisma.teacherAttendance.delete({ where: { id: recordId } });
    return { success: true };
  }
}
