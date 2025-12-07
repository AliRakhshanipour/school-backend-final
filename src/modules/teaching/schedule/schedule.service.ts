import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';
import { Prisma, Weekday } from '@prisma/client';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTimeToMinutes(time: string): number {
    // انتظار فرمت "HH:MM"
    const parts = time.split(':');
    if (parts.length !== 2) {
      throw new BadRequestException('فرمت ساعت باید HH:MM باشد');
    }
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new BadRequestException('ساعت نامعتبر است');
    }

    return hour * 60 + minute;
  }

  private async assertNoConflicts(
    academicYearId: number,
    classGroupId: number,
    mainTeacherId: string,
    assistantTeacherId: string | null,
    weekday: Weekday,
    startMinuteOfDay: number,
    endMinuteOfDay: number,
    excludeSlotId?: number,
  ) {
    // 1) تداخل برای خود کلاس
    const classConflict = await this.prisma.weeklyScheduleSlot.findFirst({
      where: {
        academicYearId,
        classGroupId,
        weekday,
        ...(excludeSlotId
          ? {
              NOT: {
                id: excludeSlotId,
              },
            }
          : {}),
        // بازه‌های زمانی که روی هم بیفتند
        startMinuteOfDay: { lte: endMinuteOfDay },
        endMinuteOfDay: { gte: startMinuteOfDay },
      },
    });

    if (classConflict) {
      throw new BadRequestException(
        'برای این کلاس در این روز و بازه زمانی قبلاً برنامه ثبت شده است',
      );
    }

    // 2) تداخل برای معلم اصلی
    const teacherConflict = await this.prisma.weeklyScheduleSlot.findFirst({
      where: {
        academicYearId,
        weekday,
        ...(excludeSlotId
          ? {
              NOT: { id: excludeSlotId },
            }
          : {}),
        startMinuteOfDay: { lte: endMinuteOfDay },
        endMinuteOfDay: { gte: startMinuteOfDay },
        courseAssignment: {
          OR: [
            { mainTeacherId },
            assistantTeacherId ? { assistantTeacherId } : { id: -1 },
          ],
        },
      },
      include: {
        courseAssignment: true,
      },
    });

    if (teacherConflict) {
      throw new BadRequestException(
        'برای یکی از معلم‌های این درس در این بازه زمانی قبلاً کلاس دیگری ثبت شده است',
      );
    }
  }

  async create(dto: CreateScheduleSlotDto) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: dto.courseAssignmentId },
      include: {
        academicYear: true,
        classGroup: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    }

    const startMinute = this.parseTimeToMinutes(dto.startTime);
    const endMinute = this.parseTimeToMinutes(dto.endTime);

    if (endMinute <= startMinute) {
      throw new BadRequestException(
        'زمان پایان باید بعد از زمان شروع باشد',
      );
    }

    // چک تداخل
    await this.assertNoConflicts(
      assignment.academicYearId,
      assignment.classGroupId,
      assignment.mainTeacherId,
      assignment.assistantTeacherId,
      dto.weekday,
      startMinute,
      endMinute,
    );

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
            classGroup: {
              include: {
                fieldOfStudy: true,
                gradeLevel: true,
              },
            },
            mainTeacher: {
              include: { user: true },
            },
            assistantTeacher: {
              include: { user: true },
            },
          },
        },
      },
    });
  }

  async findByClassGroup(classGroupId: number, academicYearId: number) {
    return this.prisma.weeklyScheduleSlot.findMany({
      where: {
        classGroupId,
        academicYearId,
      },
      orderBy: [
        { weekday: 'asc' },
        { startMinuteOfDay: 'asc' },
      ],
      include: {
        courseAssignment: {
          include: {
            course: true,
            mainTeacher: { include: { user: true } },
            assistantTeacher: { include: { user: true } },
          },
        },
      },
    });
  }

  async findByTeacher(teacherId: string, academicYearId: number) {
    return this.prisma.weeklyScheduleSlot.findMany({
      where: {
        academicYearId,
        courseAssignment: {
          OR: [
            { mainTeacherId: teacherId },
            { assistantTeacherId: teacherId },
          ],
        },
      },
      orderBy: [
        { weekday: 'asc' },
        { startMinuteOfDay: 'asc' },
      ],
      include: {
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
        courseAssignment: {
          include: {
            course: true,
          },
        },
      },
    });
  }

  async update(id: number, dto: UpdateScheduleSlotDto) {
    const slot = await this.prisma.weeklyScheduleSlot.findUnique({
      where: { id },
      include: {
        courseAssignment: true,
      },
    });
    if (!slot) {
      throw new NotFoundException('اسلات برنامه هفتگی پیدا نشد');
    }

    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: slot.courseAssignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('انتساب درس-کلاس مربوطه پیدا نشد');
    }

    const weekday = dto.weekday ?? slot.weekday;
    const startMinute = dto.startTime
      ? this.parseTimeToMinutes(dto.startTime)
      : slot.startMinuteOfDay;
    const endMinute = dto.endTime
      ? this.parseTimeToMinutes(dto.endTime)
      : slot.endMinuteOfDay;

    if (endMinute <= startMinute) {
      throw new BadRequestException(
        'زمان پایان باید بعد از زمان شروع باشد',
      );
    }

    await this.assertNoConflicts(
      assignment.academicYearId,
      assignment.classGroupId,
      assignment.mainTeacherId,
      assignment.assistantTeacherId,
      weekday,
      startMinute,
      endMinute,
      slot.id,
    );

    return this.prisma.weeklyScheduleSlot.update({
      where: { id },
      data: {
        weekday,
        startMinuteOfDay: startMinute,
        endMinuteOfDay: endMinute,
        roomLabel: dto.roomLabel ?? slot.roomLabel,
      },
      include: {
        courseAssignment: {
          include: {
            course: true,
            classGroup: {
              include: {
                fieldOfStudy: true,
                gradeLevel: true,
              },
            },
            mainTeacher: { include: { user: true } },
            assistantTeacher: { include: { user: true } },
          },
        },
      },
    });
  }

  async remove(id: number) {
    const slot = await this.prisma.weeklyScheduleSlot.findUnique({
      where: { id },
    });
    if (!slot) {
      throw new NotFoundException('اسلات برنامه هفتگی پیدا نشد');
    }

    await this.prisma.weeklyScheduleSlot.delete({
      where: { id },
    });

    return { success: true };
  }
}
