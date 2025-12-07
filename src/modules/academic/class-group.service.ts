
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';

@Injectable()
export class ClassGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassGroupDto) {
    // چک وجود سال تحصیلی
    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!year) {
      throw new BadRequestException('سال تحصیلی انتخاب‌شده وجود ندارد');
    }

    // چک وجود پایه
    const grade = await this.prisma.gradeLevel.findUnique({
      where: { id: dto.gradeLevelId },
    });
    if (!grade) {
      throw new BadRequestException('پایه تحصیلی انتخاب‌شده وجود ندارد');
    }

    // چک وجود رشته
    const field = await this.prisma.fieldOfStudy.findUnique({
      where: { id: dto.fieldOfStudyId },
    });
    if (!field) {
      throw new BadRequestException('رشته تحصیلی انتخاب‌شده وجود ندارد');
    }

    // اگر nextClassGroupId داده شده بود، چک وجودش
    if (dto.nextClassGroupId) {
      const next = await this.prisma.classGroup.findUnique({
        where: { id: dto.nextClassGroupId },
      });
      if (!next) {
        throw new BadRequestException(
          'کلاس سال بعد (nextClassGroup) وجود ندارد',
        );
      }
    }

    // (اختیاری) چک یکتا بودن code در همان سال تحصیلی
    const existing = await this.prisma.classGroup.findFirst({
      where: {
        academicYearId: dto.academicYearId,
        code: dto.code,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'کلاسی با این کد در این سال تحصیلی قبلاً ثبت شده است',
      );
    }

    return this.prisma.classGroup.create({
      data: {
        code: dto.code,
        academicYearId: dto.academicYearId,
        gradeLevelId: dto.gradeLevelId,
        fieldOfStudyId: dto.fieldOfStudyId,
        capacity: dto.capacity,
        nextClassGroupId: dto.nextClassGroupId ?? null,
      },
      include: {
        academicYear: true,
        gradeLevel: true,
        fieldOfStudy: true,
      },
    });
  }

  async findAll() {
    return this.prisma.classGroup.findMany({
      orderBy: [
        { academicYearId: 'desc' },
        { code: 'asc' },
      ],
      include: {
        academicYear: true,
        gradeLevel: true,
        fieldOfStudy: true,
      },
    });
  }

  async findByYear(yearId: number) {
    return this.prisma.classGroup.findMany({
      where: { academicYearId: yearId },
      orderBy: { code: 'asc' },
      include: {
        academicYear: true,
        gradeLevel: true,
        fieldOfStudy: true,
      },
    });
  }

  async findOne(id: number) {
    const cls = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        academicYear: true,
        gradeLevel: true,
        fieldOfStudy: true,
        enrollments: true,
      },
    });
    if (!cls) {
      throw new NotFoundException('کلاس پیدا نشد');
    }
    return cls;
  }

  async update(id: number, dto: UpdateClassGroupDto) {
    const cls = await this.prisma.classGroup.findUnique({
      where: { id },
    });
    if (!cls) {
      throw new NotFoundException('کلاس پیدا نشد');
    }

    let academicYearId = cls.academicYearId;
    let gradeLevelId = cls.gradeLevelId;
    let fieldOfStudyId = cls.fieldOfStudyId;

    if (dto.academicYearId && dto.academicYearId !== cls.academicYearId) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: dto.academicYearId },
      });
      if (!year) {
        throw new BadRequestException('سال تحصیلی انتخاب‌شده وجود ندارد');
      }
      academicYearId = dto.academicYearId;
    }

    if (dto.gradeLevelId && dto.gradeLevelId !== cls.gradeLevelId) {
      const grade = await this.prisma.gradeLevel.findUnique({
        where: { id: dto.gradeLevelId },
      });
      if (!grade) {
        throw new BadRequestException('پایه تحصیلی انتخاب‌شده وجود ندارد');
      }
      gradeLevelId = dto.gradeLevelId;
    }

    if (dto.fieldOfStudyId && dto.fieldOfStudyId !== cls.fieldOfStudyId) {
      const field = await this.prisma.fieldOfStudy.findUnique({
        where: { id: dto.fieldOfStudyId },
      });
      if (!field) {
        throw new BadRequestException('رشته تحصیلی انتخاب‌شده وجود ندارد');
      }
      fieldOfStudyId = dto.fieldOfStudyId;
    }

    if (dto.nextClassGroupId) {
      const next = await this.prisma.classGroup.findUnique({
        where: { id: dto.nextClassGroupId },
      });
      if (!next) {
        throw new BadRequestException(
          'کلاس سال بعد (nextClassGroup) وجود ندارد',
        );
      }
    }

    if (
      (dto.code && dto.code !== cls.code) ||
      academicYearId !== cls.academicYearId
    ) {
      const exists = await this.prisma.classGroup.findFirst({
        where: {
          academicYearId,
          code: dto.code ?? cls.code,
        },
      });
      if (exists && exists.id !== cls.id) {
        throw new BadRequestException(
          'کلاسی با این کد در این سال تحصیلی قبلاً ثبت شده است',
        );
      }
    }

    return this.prisma.classGroup.update({
      where: { id },
      data: {
        code: dto.code ?? cls.code,
        academicYearId,
        gradeLevelId,
        fieldOfStudyId,
        capacity: dto.capacity ?? cls.capacity,
        nextClassGroupId:
          typeof dto.nextClassGroupId === 'number'
            ? dto.nextClassGroupId
            : cls.nextClassGroupId,
      },
      include: {
        academicYear: true,
        gradeLevel: true,
        fieldOfStudy: true,
      },
    });
  }

  async remove(id: number) {
    const cls = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        enrollments: true,
      },
    });
    if (!cls) {
      throw new NotFoundException('کلاس پیدا نشد');
    }

    if (cls.enrollments.length > 0) {
      throw new BadRequestException(
        'امکان حذف کلاسی که هنرجو دارد وجود ندارد',
      );
    }

    await this.prisma.classGroup.delete({
      where: { id },
    });

    return { success: true };
  }
}
