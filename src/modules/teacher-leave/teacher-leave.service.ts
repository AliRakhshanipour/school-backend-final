import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveStatus, LeaveType } from '@prisma/client';
import { CreateTeacherLeaveRequestDto } from './dto/create-teacher-leave-request.dto';
import { TeacherLeaveFiltersDto } from './dto/teacher-leave-filters.dto';

@Injectable()
export class TeacherLeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // خروجی امن برای جلوگیری از لو رفتن password و ...
  private readonly safeUserSelect = {
    select: { id: true, username: true, role: true, createdAt: true },
  };

  private parseOptionalDate(value?: string, fieldName = 'date'): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`مقدار ${fieldName} نامعتبر است`);
    }
    return d;
  }

  private async getTeacherIdByUserId(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      throw new ForbiddenException('فقط معلم‌ها می‌توانند از این مسیر استفاده کنند');
    }
    return teacher.id;
  }

  /**
   * سال تحصیلی را دقیق و امن تشخیص می‌دهد:
   * - اگر start و end هر دو داخل یک سال تحصیلی باشند -> همان id
   * - اگر خارج باشند یا در دو سال متفاوت بیفتند -> null
   */
  private async detectAcademicYearId(start: Date, end: Date): Promise<number | null> {
    const [startYear, endYear] = await Promise.all([
      this.prisma.academicYear.findFirst({
        where: { startDate: { lte: start }, endDate: { gte: start } },
        select: { id: true },
      }),
      this.prisma.academicYear.findFirst({
        where: { startDate: { lte: end }, endDate: { gte: end } },
        select: { id: true },
      }),
    ]);

    if (!startYear || !endYear) return null;
    if (startYear.id !== endYear.id) return null;
    return startYear.id;
  }

  // نسخه tx-safe برای overlap (بعد از lock)
  private async assertNoOverlapTx(tx: any, teacherId: string, start: Date, end: Date) {
    const overlapping = await tx.teacherLeaveRequest.findFirst({
      where: {
        teacherId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException('در این بازه زمانی قبلاً مرخصی ثبت شده (در انتظار یا تأیید شده)');
    }
  }

  // ------------ Teacher side ------------

  async createForTeacher(userId: string, dto: CreateTeacherLeaveRequestDto) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('تاریخ شروع یا پایان نامعتبر است');
    }
    if (end <= start) {
      throw new BadRequestException('تاریخ پایان باید بعد از تاریخ شروع باشد');
    }

    const academicYearId = await this.detectAcademicYearId(start, end);

    // ✅ FIX حیاتی: اگر سال تحصیلی تشخیص داده نشد، خطای کنترل‌شده بدهیم
    // تا به مشکل runtime/constraint روی academicYearId نخوریم.
    if (academicYearId == null) {
      throw new BadRequestException('بازه مرخصی باید داخل یک سال تحصیلی معتبر باشد');
    }

    // جلوگیری از race condition با lock داخل transaction
    return this.prisma.$transaction(async (tx) => {
      // قفل روی مرخصی‌های فعال این معلم (برای جلوگیری از ثبت همزمان)
      await tx.$queryRaw`
        SELECT id FROM "TeacherLeaveRequest"
        WHERE "teacherId" = ${teacherId}
          AND "status" IN ('PENDING','APPROVED')
        FOR UPDATE
      `;

      await this.assertNoOverlapTx(tx, teacherId, start, end);

      return tx.teacherLeaveRequest.create({
        data: {
          teacherId,
          academicYearId,
          type: (dto.type as LeaveType) ?? null,
          startDate: start,
          endDate: end,
          isFullDay: dto.isFullDay,
          reason: dto.reason ?? null,
          status: LeaveStatus.PENDING,
        },
        include: {
          teacher: { include: { user: this.safeUserSelect } },
          academicYear: true,
        },
      });
    });
  }

  async findMyRequests(userId: string, status?: LeaveStatus) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    return this.prisma.teacherLeaveRequest.findMany({
      where: { teacherId, ...(status ? { status } : {}) },
      orderBy: { startDate: 'desc' },
      include: { academicYear: true },
    });
  }

  async findMyRequestById(userId: string, id: number) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    const request = await this.prisma.teacherLeaveRequest.findUnique({
      where: { id },
      include: { academicYear: true },
    });

    if (!request || request.teacherId !== teacherId) {
      throw new NotFoundException('درخواست مرخصی پیدا نشد');
    }
    return request;
  }

  async cancelMyRequest(userId: string, id: number) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    const request = await this.prisma.teacherLeaveRequest.findUnique({
      where: { id },
      select: { id: true, teacherId: true, status: true },
    });

    if (!request || request.teacherId !== teacherId) {
      throw new NotFoundException('درخواست مرخصی پیدا نشد');
    }
    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('فقط درخواست‌های در حال انتظار قابل لغو هستند');
    }

    return this.prisma.teacherLeaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
    });
  }

  // ------------ Admin side ------------

  async adminList(filters: TeacherLeaveFiltersDto) {
    const where: any = {};

    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (filters.status) where.status = filters.status;
    if (typeof filters.academicYearId === 'number') where.academicYearId = filters.academicYearId;

    const fromDate = this.parseOptionalDate(filters.from, 'from');
    const toDate = this.parseOptionalDate(filters.to, 'to');

    if (fromDate && toDate && toDate < fromDate) {
      throw new BadRequestException('بازه تاریخ نامعتبر است (to قبل از from است)');
    }

    // فیلتر صحیح بازه زمانی (overlap)
    if (fromDate || toDate) {
      where.AND = [
        ...(toDate ? [{ startDate: { lte: toDate } }] : []),
        ...(fromDate ? [{ endDate: { gte: fromDate } }] : []),
      ];
    }

    return this.prisma.teacherLeaveRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      include: {
        teacher: { include: { user: this.safeUserSelect } },
        academicYear: true,
        decidedByUser: this.safeUserSelect,
      },
    });
  }

  async adminGetById(id: number) {
    const request = await this.prisma.teacherLeaveRequest.findUnique({
      where: { id },
      include: {
        teacher: { include: { user: this.safeUserSelect } },
        academicYear: true,
        decidedByUser: this.safeUserSelect,
      },
    });

    if (!request) throw new NotFoundException('درخواست مرخصی پیدا نشد');
    return request;
  }

  private async adminDecide(
    id: number,
    adminUserId: string,
    status: LeaveStatus,
    decisionNote?: string,
  ) {
    const request = await this.prisma.teacherLeaveRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!request) throw new NotFoundException('درخواست مرخصی پیدا نشد');
    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('فقط درخواست‌های در حال انتظار قابل تأیید/رد هستند');
    }

    return this.prisma.teacherLeaveRequest.update({
      where: { id },
      data: {
        status,
        decidedByUserId: adminUserId,
        decidedAt: new Date(),
        decisionNote: decisionNote ?? null,
      },
      include: {
        teacher: { include: { user: this.safeUserSelect } },
        decidedByUser: this.safeUserSelect,
        academicYear: true,
      },
    });
  }

  async adminApprove(id: number, adminUserId: string, decisionNote?: string) {
    return this.adminDecide(id, adminUserId, LeaveStatus.APPROVED, decisionNote);
  }

  async adminReject(id: number, adminUserId: string, decisionNote?: string) {
    return this.adminDecide(id, adminUserId, LeaveStatus.REJECTED, decisionNote);
  }
}
