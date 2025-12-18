import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';
import { Weekday } from '@prisma/client';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ خروجی امن برای User
  private readonly safeUserSelect = {
    select: { id: true, username: true, role: true, createdAt: true },
  };

  private parseTimeToMinutes(time: string): number {
    const parts = time.split(':');
    if (parts.length !== 2) throw new BadRequestException('فرمت ساعت باید HH:MM باشد');

    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    if (
      Number.isNaN(hour) || Number.isNaN(minute) ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59
    ) {
      throw new BadRequestException('ساعت نامعتبر است');
    }

    return hour * 60 + minute;
  }

  private async assertNoConflicts(params: {
    academicYearId: number;
    classGroupId: number;
    teacherIdsToCheck: string[];
    weekday: Weekday;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
    excludeSlotId?: number;
  }) {
    const {
      academicYearId,
      classGroupId,
      teacherIdsToCheck,
      weekday,
      startMinuteOfDay,
      endMinuteOfDay,
      excludeSlotId,
    } = params;

    const slotNot = excludeSlotId ? { id: { not: excludeSlotId } } : {};

    const classConflict = await this.prisma.weeklyScheduleSlot.findFirst({
      where: {
        ...slotNot,
        academicYearId,
        classGroupId,
        weekday,
        startMinuteOfDay: { lt: endMinuteOfDay },
        endMinuteOfDay: { gt: startMinuteOfDay },
      },
      select: { id: true },
    });

    if (classConflict) {
      throw new BadRequestException('برای این کلاس در این روز و بازه زمانی قبلاً برنامه ثبت شده است');
    }

    const teacherConflict = await this.prisma.weeklyScheduleSlot.findFirst({
      where: {
        ...slotNot,
        academicYearId,
        weekday,
        startMinuteOfDay: { lt: endMinuteOfDay },
        endMinuteOfDay: { gt: startMinuteOfDay },
        courseAssignment: {
          OR: [
            { mainTeacherId: { in: teacherIdsToCheck } },
            { assistantTeacherId: { in: teacherIdsToCheck } },
          ],
        },
      },
      select: { id: true },
    });

    if (teacherConflict) {
      throw new BadRequestException('برای یکی از معلم‌های این درس در این بازه زمانی قبلاً کلاس دیگری ثبت شده است');
    }
  }

  async create(dto: CreateScheduleSlotDto) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: dto.courseAssignmentId },
      include: { academicYear: true, classGroup: true },
    });
    if (!assignment) throw new NotFoundException('انتساب درس-کلاس پیدا نشد');

    const startMinute = this.parseTimeToMinutes(dto.startTime);
    const endMinute = this.parseTimeToMinutes(dto.endTime);
    if (endMinute <= startMinute) throw new BadRequestException('زمان پایان باید بعد از زمان شروع باشد');

    const teacherIds = [assignment.mainTeacherId, assignment.assistantTeacherId].filter(Boolean) as string[];

    await this.assertNoConflicts({
      academicYearId: assignment.academicYearId,
      classGroupId: assignment.classGroupId,
      teacherIdsToCheck: teacherIds,
      weekday: dto.weekday,
      startMinuteOfDay: startMinute,
      endMinuteOfDay: endMinute,
    });

    return this.prisma.weeklyScheduleSlot.create({
      data: {
        academicYearId: assignment.academicYearId,
        classGroupId: assignment.classGroupId,
        courseAssignmentId: assignment.id,
        weekday: dto.weekday,
        startMinuteOfDay: startMinute,
        endMinuteOfDay: endMinute,
        roomLabel: dto.roomLabel ?? null,
      },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            mainTeacher: { include: { user: this.safeUserSelect } },
            assistantTeacher: { include: { user: this.safeUserSelect } },
          },
        },
      },
    });
  }

  async findByClassGroup(classGroupId: number, academicYearId: number) {
    return this.prisma.weeklyScheduleSlot.findMany({
      where: { classGroupId, academicYearId },
      orderBy: [{ weekday: 'asc' }, { startMinuteOfDay: 'asc' }],
      include: {
        courseAssignment: {
          include: {
            course: true,
            mainTeacher: { include: { user: this.safeUserSelect } },
            assistantTeacher: { include: { user: this.safeUserSelect } },
          },
        },
      },
    });
  }

  async findByTeacher(userId: string, academicYearId: number) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    return this.prisma.weeklyScheduleSlot.findMany({
      where: {
        academicYearId,
        courseAssignment: {
          OR: [{ mainTeacherId: teacherId }, { assistantTeacherId: teacherId }],
        },
      },
      orderBy: [{ weekday: 'asc' }, { startMinuteOfDay: 'asc' }],
      include: {
        classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        courseAssignment: { include: { course: true } },
      },
    });
  }

  async update(id: number, dto: UpdateScheduleSlotDto) {
    const slot = await this.prisma.weeklyScheduleSlot.findUnique({
      where: { id },
      include: { courseAssignment: true },
    });
    if (!slot) throw new NotFoundException('اسلات برنامه هفتگی پیدا نشد');

    if (dto.courseAssignmentId && dto.courseAssignmentId !== slot.courseAssignmentId) {
      throw new BadRequestException('برای تغییر انتساب این اسلات، آن را حذف و مجدد ایجاد کنید');
    }

    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: slot.courseAssignmentId },
    });
    if (!assignment) throw new NotFoundException('انتساب درس-کلاس مربوطه پیدا نشد');

    const weekday = dto.weekday ?? slot.weekday;
    const startMinute = dto.startTime ? this.parseTimeToMinutes(dto.startTime) : slot.startMinuteOfDay;
    const endMinute = dto.endTime ? this.parseTimeToMinutes(dto.endTime) : slot.endMinuteOfDay;

    if (endMinute <= startMinute) throw new BadRequestException('زمان پایان باید بعد از زمان شروع باشد');

    const teacherIds = [assignment.mainTeacherId, assignment.assistantTeacherId].filter(Boolean) as string[];

    await this.assertNoConflicts({
      academicYearId: assignment.academicYearId,
      classGroupId: assignment.classGroupId,
      teacherIdsToCheck: teacherIds,
      weekday,
      startMinuteOfDay: startMinute,
      endMinuteOfDay: endMinute,
      excludeSlotId: slot.id,
    });

    return this.prisma.weeklyScheduleSlot.update({
      where: { id },
      data: {
        weekday,
        startMinuteOfDay: startMinute,
        endMinuteOfDay: endMinute,
        roomLabel: dto.roomLabel !== undefined ? (dto.roomLabel ?? null) : slot.roomLabel,
      },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
            mainTeacher: { include: { user: this.safeUserSelect } },
            assistantTeacher: { include: { user: this.safeUserSelect } },
          },
        },
      },
    });
  }

  async remove(id: number) {
    const slot = await this.prisma.weeklyScheduleSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('اسلات برنامه هفتگی پیدا نشد');

    await this.prisma.weeklyScheduleSlot.delete({ where: { id } });
    return { success: true };
  }

  private async getTeacherIdByUserId(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new ForbiddenException('فقط معلم‌ها می‌توانند این مسیر را ببینند');
    return teacher.id;
  }
}
