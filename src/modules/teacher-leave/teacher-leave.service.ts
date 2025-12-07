// src/modules/teacher-leave/teacher-leave.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, LeaveStatus, LeaveType } from '@prisma/client';
import { CreateTeacherLeaveRequestDto } from './dto/create-teacher-leave-request.dto';
import { TeacherLeaveFiltersDto } from './dto/teacher-leave-filters.dto';

@Injectable()
export class TeacherLeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------ Helpers ------------

  private async getTeacherIdByUserId(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });
    if (!teacher) {
      throw new ForbiddenException(
        'فقط معلم‌ها می‌توانند از این مسیر استفاده کنند',
      );
    }
    return teacher.id;
  }

  /**
   * پیدا کردن سال تحصیلی بر اساس تاریخ شروع/پایان (اگر در بازه یکی از سال‌ها باشد)
   */
  private async detectAcademicYearId(
    start: Date,
    end: Date,
  ): Promise<number | null> {
    const year = await this.prisma.academicYear.findFirst({
      where: {
        startDate: { lte: start },
        endDate: { gte: end },
      },
    });
    return year ? year.id : null;
  }

  /**
   * چک تداخل مرخصی با مرخصی‌های قبلی (PENDING/APPROVED) برای همان معلم
   */
  private async assertNoOverlap(
    teacherId: string,
    start: Date,
    end: Date,
  ) {
    const overlapping = await this.prisma.teacherLeaveRequest.findFirst({
      where: {
        teacherId,
        status: {
          in: [
            LeaveStatus.PENDING,
            LeaveStatus.APPROVED,
          ],
        },
        // بازه‌ها روی هم بیفتند: start <= existingEnd && end >= existingStart
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'در این بازه زمانی قبلاً مرخصی ثبت شده (در انتظار یا تأیید شده)',
      );
    }
  }

  // ------------ Teacher side ------------

  async createForTeacher(
    userId: string,
    dto: CreateTeacherLeaveRequestDto,
  ) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('تاریخ شروع یا پایان نامعتبر است');
    }

    if (end <= start) {
      throw new BadRequestException(
        'تاریخ پایان باید بعد از تاریخ شروع باشد',
      );
    }

    // جلوگیری از تداخل
    await this.assertNoOverlap(teacherId, start, end);

    // تشخیص سال تحصیلی (اگر در یکی از سال‌ها بگنجد)
    const academicYearId = await this.detectAcademicYearId(start, end);

    const created = await this.prisma.teacherLeaveRequest.create({
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
        teacher: {
          include: {
            user: true,
          },
        },
        academicYear: true,
      },
    });

    return created;
  }

  async findMyRequests(
    userId: string,
    status?: LeaveStatus,
  ) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    return this.prisma.teacherLeaveRequest.findMany({
      where: {
        teacherId,
        ...(status ? { status } : {}),
      },
      orderBy: {
        startDate: 'desc',
      },
      include: {
        academicYear: true,
      },
    });
  }

  async findMyRequestById(userId: string, id: number) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    const request = await this.prisma.teacherLeaveRequest.findUnique({
      where: { id },
      include: {
        academicYear: true,
      },
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
    });

    if (!request || request.teacherId !== teacherId) {
      throw new NotFoundException('درخواست مرخصی پیدا نشد');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'فقط درخواست‌های در حال انتظار قابل لغو هستند',
      );
    }

    return this.prisma.teacherLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
      },
    });
  }

  // ------------ Admin side ------------

  async adminList(filters: TeacherLeaveFiltersDto) {
    const where: any = {};

    if (filters.teacherId) {
      where.teacherId = filters.teacherId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (typeof filters.academicYearId === 'number') {
      where.academicYearId = filters.academicYearId;
    }

    if (filters.from || filters.to) {
      where.startDate = {};
      if (filters.from) {
        where.startDate.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.startDate.lte = new Date(filters.to);
      }
    }

    return this.prisma.teacherLeaveRequest.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { startDate: 'desc' },
      ],
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        academicYear: true,
        decidedByUser: true,
      },
    });
  }

  async adminGetById(id: number) {
    const request = await this.prisma.teacherLeaveRequest.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        academicYear: true,
        decidedByUser: true,
      },
    });

    if (!request) {
      throw new NotFoundException('درخواست مرخصی پیدا نشد');
    }

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
    });

    if (!request) {
      throw new NotFoundException('درخواست مرخصی پیدا نشد');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'فقط درخواست‌های در حال انتظار قابل تأیید/رد هستند',
      );
    }

    const updated = await this.prisma.teacherLeaveRequest.update({
      where: { id },
      data: {
        status,
        decidedByUserId: adminUserId,
        decidedAt: new Date(),
        decisionNote: decisionNote ?? null,
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        decidedByUser: true,
        academicYear: true,
      },
    });

    return updated;
  }

  async adminApprove(
    id: number,
    adminUserId: string,
    decisionNote?: string,
  ) {
    return this.adminDecide(
      id,
      adminUserId,
      LeaveStatus.APPROVED,
      decisionNote,
    );
  }

  async adminReject(
    id: number,
    adminUserId: string,
    decisionNote?: string,
  ) {
    return this.adminDecide(
      id,
      adminUserId,
      LeaveStatus.REJECTED,
      decisionNote,
    );
  }
}
