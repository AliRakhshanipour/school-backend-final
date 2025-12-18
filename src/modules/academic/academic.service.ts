import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SchoolType, ShiftType } from '@prisma/client';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------
  // AcademicYear
  // ------------------------------------

  async createAcademicYear(dto: {
    label: string;
    startDate: string;
    endDate: string;
  }) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('تاریخ پایان باید بعد از تاریخ شروع باشد');
    }

    // جلوگیری از هم‌پوشانی سال‌ها (اختیاری ولی منطقی)
    const overlap = await this.prisma.academicYear.findFirst({
      where: {
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlap) {
      throw new BadRequestException(
        `سال تحصیلی دیگری با بازه زمانی هم‌پوشان وجود دارد (${overlap.label})`,
      );
    }

    try {
      return await this.prisma.academicYear.create({
        data: {
          label: dto.label,
          startDate: start,
          endDate: end,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('لیبل سال تحصیلی تکراری است');
      }
      throw e;
    }
  }

  async updateAcademicYear(
    id: number,
    dto: Partial<{ label: string; startDate: string; endDate: string }>,
  ) {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }

    const start = dto.startDate ? new Date(dto.startDate) : year.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : year.endDate;

    if (end <= start) {
      throw new BadRequestException('تاریخ پایان باید بعد از تاریخ شروع باشد');
    }

    try {
      return await this.prisma.academicYear.update({
        where: { id },
        data: {
          label: dto.label ?? year.label,
          startDate: start,
          endDate: end,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('لیبل سال تحصیلی تکراری است');
      }
      throw e;
    }
  }

  async deleteAcademicYear(id: number) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        classGroups: true,
        enrollments: true,
        preRegistrations: true,
        teacherLeaveRequests: true,
        courseAssignments: true,
        weeklyScheduleSlots: true,
        courseSessions: true,
        theoryExams: true,
      },
    });

    if (!year) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }

    if (
      year.classGroups.length > 0 ||
      year.enrollments.length > 0 ||
      year.preRegistrations.length > 0 ||
      year.teacherLeaveRequests.length > 0 ||
      year.courseAssignments.length > 0 ||
      year.weeklyScheduleSlots.length > 0 ||
      year.courseSessions.length > 0 ||
      year.theoryExams.length > 0
    ) {
      throw new BadRequestException(
        'برای این سال تحصیلی داده‌های وابسته وجود دارد و نمی‌توان آن را حذف کرد',
      );
    }

    await this.prisma.academicYear.delete({ where: { id } });
    return { success: true };
  }

  async getAcademicYear(id: number) {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }
    return year;
  }

  async listAcademicYears() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  // ------------------------------------
  // GradeLevel
  // ------------------------------------

  async createGradeLevel(dto: { name: string; order: number }) {
    try {
      return await this.prisma.gradeLevel.create({
        data: {
          name: dto.name,
          order: dto.order,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('نام پایه یا ترتیب آن تکراری است');
      }
      throw e;
    }
  }

  async updateGradeLevel(id: number, dto: Partial<{ name: string; order: number }>) {
    const grade = await this.prisma.gradeLevel.findUnique({ where: { id } });
    if (!grade) {
      throw new NotFoundException('پایه پیدا نشد');
    }

    try {
      return await this.prisma.gradeLevel.update({
        where: { id },
        data: {
          name: dto.name ?? grade.name,
          order: dto.order ?? grade.order,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('نام پایه یا ترتیب آن تکراری است');
      }
      throw e;
    }
  }

  async deleteGradeLevel(id: number) {
    const grade = await this.prisma.gradeLevel.findUnique({
      where: { id },
      include: { classGroups: true, courses: true },
    });

    if (!grade) {
      throw new NotFoundException('پایه پیدا نشد');
    }

    if (grade.classGroups.length > 0 || grade.courses.length > 0) {
      throw new BadRequestException(
        'برای این پایه کلاس یا درس تعریف شده است و امکان حذف وجود ندارد',
      );
    }

    await this.prisma.gradeLevel.delete({ where: { id } });
    return { success: true };
  }

  async listGradeLevels() {
    return this.prisma.gradeLevel.findMany({ orderBy: { order: 'asc' } });
  }

  // ------------------------------------
  // FieldOfStudy
  // ------------------------------------

  async createFieldOfStudy(dto: {
    name: string;
    schoolType: SchoolType;
    shift: ShiftType;
    isActive?: boolean;
  }) {
    const exists = await this.prisma.fieldOfStudy.findFirst({
      where: {
        name: dto.name,
        schoolType: dto.schoolType,
        shift: dto.shift,
      },
    });

    if (exists) {
      throw new BadRequestException(
        'رشته‌ای با همین نام، نوع مدرسه و شیفت قبلاً ثبت شده است',
      );
    }

    return this.prisma.fieldOfStudy.create({
      data: {
        name: dto.name,
        schoolType: dto.schoolType,
        shift: dto.shift,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateFieldOfStudy(
    id: number,
    dto: Partial<{
      name: string;
      schoolType: SchoolType;
      shift: ShiftType;
      isActive: boolean;
    }>,
  ) {
    const field = await this.prisma.fieldOfStudy.findUnique({ where: { id } });
    if (!field) {
      throw new NotFoundException('رشته پیدا نشد');
    }

    const name = dto.name ?? field.name;
    const schoolType = dto.schoolType ?? field.schoolType;
    const shift = dto.shift ?? field.shift;

    if (name !== field.name || schoolType !== field.schoolType || shift !== field.shift) {
      const exists = await this.prisma.fieldOfStudy.findFirst({
        where: {
          name,
          schoolType,
          shift,
          id: { not: id },
        },
      });
      if (exists) {
        throw new BadRequestException(
          'رشته‌ای با همین نام، نوع مدرسه و شیفت قبلاً ثبت شده است',
        );
      }
    }

    return this.prisma.fieldOfStudy.update({
      where: { id },
      data: {
        name,
        schoolType,
        shift,
        isActive:
          typeof dto.isActive === 'boolean' ? dto.isActive : field.isActive,
      },
    });
  }

  async deleteFieldOfStudy(id: number) {
    const field = await this.prisma.fieldOfStudy.findUnique({
      where: { id },
      include: {
        classGroups: true,
        courses: true,
        requestedPreRegistrations: true,
        admittedPreRegistrations: true,
      },
    });

    if (!field) {
      throw new NotFoundException('رشته پیدا نشد');
    }

    if (
      field.classGroups.length > 0 ||
      field.courses.length > 0 ||
      field.requestedPreRegistrations.length > 0 ||
      field.admittedPreRegistrations.length > 0
    ) {
      throw new BadRequestException(
        'این رشته در کلاس‌ها/دروس/پیش‌ثبت‌نام‌ها استفاده شده است و امکان حذف فیزیکی وجود ندارد. می‌توانید آن را غیرفعال کنید.',
      );
    }

    await this.prisma.fieldOfStudy.delete({ where: { id } });
    return { success: true };
  }

  async listFieldOfStudies() {
    return this.prisma.fieldOfStudy.findMany({ orderBy: { name: 'asc' } });
  }

  // ------------------------------------
  // ClassGroup
  // ------------------------------------

  private async validateClassGroupRelations(input: {
    academicYearId: number;
    gradeLevelId: number;
    fieldOfStudyId: number;
  }) {
    const [year, grade, field] = await Promise.all([
      this.prisma.academicYear.findUnique({ where: { id: input.academicYearId } }),
      this.prisma.gradeLevel.findUnique({ where: { id: input.gradeLevelId } }),
      this.prisma.fieldOfStudy.findUnique({ where: { id: input.fieldOfStudyId } }),
    ]);

    if (!year) throw new BadRequestException('سال تحصیلی معتبر نیست');
    if (!grade) throw new BadRequestException('پایه معتبر نیست');
    if (!field) throw new BadRequestException('رشته معتبر نیست');
  }

  private async validateNextClassGroup(
    current: { academicYearId: number; gradeLevelId: number },
    nextClassGroupId: number,
  ) {
    const [currentGrade, next] = await Promise.all([
      this.prisma.gradeLevel.findUnique({ where: { id: current.gradeLevelId } }),
      this.prisma.classGroup.findUnique({
        where: { id: nextClassGroupId },
        include: { gradeLevel: true },
      }),
    ]);

    if (!next) {
      throw new BadRequestException('کلاس مقصد (nextClassGroupId) پیدا نشد');
    }
    if (!currentGrade || !next.gradeLevel) {
      throw new BadRequestException('پایه‌ی کلاس مبدا/مقصد نامعتبر است');
    }

    if (next.academicYearId <= current.academicYearId) {
      throw new BadRequestException('کلاس مقصد باید در سال تحصیلی بعدی تعریف شده باشد');
    }

    if (next.gradeLevel.order <= currentGrade.order) {
      throw new BadRequestException('پایه کلاس مقصد باید بالاتر از پایه کلاس مبدا باشد');
    }
  }

  async createClassGroup(dto: {
    code: string;
    academicYearId: number;
    gradeLevelId: number;
    fieldOfStudyId: number;
    capacity?: number;
    nextClassGroupId?: number;
  }) {
    await this.validateClassGroupRelations({
      academicYearId: dto.academicYearId,
      gradeLevelId: dto.gradeLevelId,
      fieldOfStudyId: dto.fieldOfStudyId,
    });

    if (dto.nextClassGroupId) {
      await this.validateNextClassGroup(
        { academicYearId: dto.academicYearId, gradeLevelId: dto.gradeLevelId },
        dto.nextClassGroupId,
      );
    }

    try {
      return await this.prisma.classGroup.create({
        data: {
          code: dto.code,
          academicYearId: dto.academicYearId,
          gradeLevelId: dto.gradeLevelId,
          fieldOfStudyId: dto.fieldOfStudyId,
          capacity: dto.capacity ?? 30,
          nextClassGroupId: dto.nextClassGroupId ?? null,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          'در این سال تحصیلی، کلاسی با این کد قبلاً ثبت شده است',
        );
      }
      throw e;
    }
  }

  async updateClassGroup(
    id: number,
    dto: Partial<{
      code: string;
      academicYearId: number;
      gradeLevelId: number;
      fieldOfStudyId: number;
      capacity: number;
      nextClassGroupId: number | null;
    }>,
  ) {
    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        gradeLevel: true,
        enrollments: { where: { isActive: true } },
      },
    });

    if (!classGroup) {
      throw new NotFoundException('کلاس پیدا نشد');
    }

    const academicYearId = dto.academicYearId ?? classGroup.academicYearId;
    const gradeLevelId = dto.gradeLevelId ?? classGroup.gradeLevelId;
    const fieldOfStudyId = dto.fieldOfStudyId ?? classGroup.fieldOfStudyId;

    await this.validateClassGroupRelations({ academicYearId, gradeLevelId, fieldOfStudyId });

    if (dto.capacity !== undefined) {
      if (dto.capacity < classGroup.enrollments.length) {
        throw new BadRequestException(
          `ظرفیت جدید (${dto.capacity}) کمتر از تعداد هنرجویان ثبت‌نام‌شده (${classGroup.enrollments.length}) است`,
        );
      }
    }

    const nextClassGroupId =
      dto.nextClassGroupId !== undefined ? dto.nextClassGroupId : classGroup.nextClassGroupId;

    if (nextClassGroupId) {
      await this.validateNextClassGroup({ academicYearId, gradeLevelId }, nextClassGroupId);
    }

    try {
      return await this.prisma.classGroup.update({
        where: { id },
        data: {
          code: dto.code ?? classGroup.code,
          academicYearId,
          gradeLevelId,
          fieldOfStudyId,
          capacity: dto.capacity ?? classGroup.capacity,
          nextClassGroupId: nextClassGroupId ?? null,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          'در این سال تحصیلی، کلاسی با این کد قبلاً ثبت شده است',
        );
      }
      throw e;
    }
  }

  async deleteClassGroup(id: number) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        enrollments: true,
        courseAssignments: true,
        weeklyScheduleSlots: true,
        sessions: true,
        theoryExams: true,
        preRegistrations: true,
        previousClassGroups: true,
      },
    });

    if (!group) {
      throw new NotFoundException('کلاس پیدا نشد');
    }

    if (
      group.enrollments.length > 0 ||
      group.courseAssignments.length > 0 ||
      group.weeklyScheduleSlots.length > 0 ||
      group.sessions.length > 0 ||
      group.theoryExams.length > 0 ||
      group.preRegistrations.length > 0
    ) {
      throw new BadRequestException(
        'برای این کلاس داده‌های آموزشی/ثبت‌نامی وجود دارد و امکان حذف فیزیکی نیست',
      );
    }

    if (group.previousClassGroups.length > 0) {
      throw new BadRequestException(
        'این کلاس به عنوان کلاس مقصد ارتقای کلاس‌های دیگر تنظیم شده است. ابتدا لینک‌های ارتقا را اصلاح کنید.',
      );
    }

    await this.prisma.classGroup.delete({ where: { id } });
    return { success: true };
  }

  async getClassGroup(id: number) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        academicYear: true,
        gradeLevel: true,
        fieldOfStudy: true,
        nextClassGroup: true,
      },
    });

    if (!group) {
      throw new NotFoundException('کلاس پیدا نشد');
    }

    return group;
  }

  async listClassGroups(filters?: {
    academicYearId?: number;
    fieldOfStudyId?: number;
    gradeLevelId?: number;
  }) {
    const where: Prisma.ClassGroupWhereInput = {};

    if (filters?.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters?.fieldOfStudyId) where.fieldOfStudyId = filters.fieldOfStudyId;
    if (filters?.gradeLevelId) where.gradeLevelId = filters.gradeLevelId;

    return this.prisma.classGroup.findMany({
      where,
      orderBy: [
        { academicYearId: 'desc' },
        { gradeLevelId: 'asc' },
        { code: 'asc' },
      ],
      include: {
        academicYear: true,
        gradeLevel: true,
        fieldOfStudy: true,
        nextClassGroup: true,
      },
    });
  }

  // ------------------------------------
  // Promotion
  // ------------------------------------

  async promoteYear(dto: {
    fromAcademicYearId: number;
    toAcademicYearId: number;
    dryRun: boolean;
  }) {
    if (dto.fromAcademicYearId === dto.toAcademicYearId) {
      throw new BadRequestException('سال مبدا و مقصد نباید یکسان باشند');
    }

    const [fromYear, toYear] = await Promise.all([
      this.prisma.academicYear.findUnique({
        where: { id: dto.fromAcademicYearId },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: dto.toAcademicYearId },
      }),
    ]);

    if (!fromYear) throw new NotFoundException('سال مبدا پیدا نشد');
    if (!toYear) throw new NotFoundException('سال مقصد پیدا نشد');

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: dto.fromAcademicYearId,
        isActive: true,
      },
      include: {
        student: true,
        classGroup: {
          include: {
            nextClassGroup: true,
            gradeLevel: true,
          },
        },
      },
    });

    const total = enrollments.length;

    const candidates = enrollments.filter((e) => e.classGroup.nextClassGroup !== null);
    const missingNext = enrollments.filter((e) => !e.classGroup.nextClassGroup);

    const wrongYear = candidates.filter(
      (e) => e.classGroup.nextClassGroup!.academicYearId !== dto.toAcademicYearId,
    );

    const validToPromote = candidates.filter(
      (e) =>
        e.classGroup.nextClassGroup &&
        e.classGroup.nextClassGroup.academicYearId === dto.toAcademicYearId,
    );

    let createdCount = 0;
    let updatedCount = 0;

    if (!dto.dryRun && validToPromote.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const enr of validToPromote) {
          const nextClassGroup = enr.classGroup.nextClassGroup!;

          const existing = await tx.studentEnrollment.findUnique({
            where: {
              studentId_academicYearId: {
                studentId: enr.studentId,
                academicYearId: dto.toAcademicYearId,
              },
            },
          });

          if (existing) {
            await tx.studentEnrollment.update({
              where: {
                studentId_academicYearId: {
                  studentId: enr.studentId,
                  academicYearId: dto.toAcademicYearId,
                },
              },
              data: {
                classGroupId: nextClassGroup.id,
                isActive: true,
              },
            });
            updatedCount++;
          } else {
            await tx.studentEnrollment.create({
              data: {
                studentId: enr.studentId,
                academicYearId: dto.toAcademicYearId,
                classGroupId: nextClassGroup.id,
                isActive: true,
              },
            });
            createdCount++;
          }
        }
      });
    }

    return {
      fromYear,
      toYear,
      totalEnrollmentsInFromYear: total,
      candidatesWithNextClassGroup: candidates.length,
      validToPromote: validToPromote.length,
      missingNextClassGroup: missingNext.length,
      wrongTargetYear: wrongYear.length,
      dryRun: dto.dryRun,
      ...(dto.dryRun
        ? {}
        : {
            createdEnrollments: createdCount,
            updatedEnrollments: updatedCount,
          }),
    };
  }
}
