import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@Injectable()
export class AcademicYearService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAcademicYearDto) {
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

    const existing = await this.prisma.academicYear.findUnique({
      where: { label: dto.label },
    });
    if (existing) {
      throw new BadRequestException(
        'سال تحصیلی با این برچسب قبلاً تعریف شده است',
      );
    }

    return this.prisma.academicYear.create({
      data: {
        label: dto.label,
        startDate: start,
        endDate: end,
      },
    });
  }

  async findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }
    return year;
  }

  async update(id: number, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }

    let start = year.startDate;
    let end = year.endDate;

    if (dto.startDate) {
      const s = new Date(dto.startDate);
      if (Number.isNaN(s.getTime())) {
        throw new BadRequestException('تاریخ شروع نامعتبر است');
      }
      start = s;
    }

    if (dto.endDate) {
      const e = new Date(dto.endDate);
      if (Number.isNaN(e.getTime())) {
        throw new BadRequestException('تاریخ پایان نامعتبر است');
      }
      end = e;
    }

    if (end <= start) {
      throw new BadRequestException(
        'تاریخ پایان باید بعد از تاریخ شروع باشد',
      );
    }

    return this.prisma.academicYear.update({
      where: { id },
      data: {
        label: dto.label ?? year.label,
        startDate: start,
        endDate: end,
      },
    });
  }

  async remove(id: number) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        classGroups: true,
        enrollments: true,
        preRegistrations: true,
      },
    });
    if (!year) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }

    if (
      year.classGroups.length > 0 ||
      year.enrollments.length > 0 ||
      year.preRegistrations.length > 0
    ) {
      throw new BadRequestException(
        'امکان حذف سال تحصیلی که کلاس یا ثبت‌نام دارد وجود ندارد',
      );
    }

    await this.prisma.academicYear.delete({
      where: { id },
    });

    return { success: true };
  }
}
