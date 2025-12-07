import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFieldOfStudyDto } from './dto/create-field-of-study.dto';
import { UpdateFieldOfStudyDto } from './dto/update-field-of-study.dto';

@Injectable()
export class FieldOfStudyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFieldOfStudyDto) {
    const existing = await this.prisma.fieldOfStudy.findUnique({
      where: {
        name_schoolType_shift: {
          name: dto.name,
          schoolType: dto.schoolType,
          shift: dto.shift,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'رشته‌ای با همین نام، نوع مدرسه و شیفت از قبل وجود دارد',
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

  async findAllAdmin() {
    return this.prisma.fieldOfStudy.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllPublic() {
    return this.prisma.fieldOfStudy.findMany({
      where: {
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const field = await this.prisma.fieldOfStudy.findUnique({
      where: { id },
    });
    if (!field) {
      throw new NotFoundException('رشته پیدا نشد');
    }
    return field;
  }

  async update(id: number, dto: UpdateFieldOfStudyDto) {
    const field = await this.prisma.fieldOfStudy.findUnique({
      where: { id },
    });
    if (!field) {
      throw new NotFoundException('رشته پیدا نشد');
    }

    if (
      (dto.name && dto.name !== field.name) ||
      (dto.schoolType && dto.schoolType !== field.schoolType) ||
      (dto.shift && dto.shift !== field.shift)
    ) {
      const exists = await this.prisma.fieldOfStudy.findUnique({
        where: {
          name_schoolType_shift: {
            name: dto.name ?? field.name,
            schoolType: dto.schoolType ?? field.schoolType,
            shift: dto.shift ?? field.shift,
          },
        },
      });
      if (exists && exists.id !== field.id) {
        throw new BadRequestException(
          'رشته‌ای با همین نام، نوع مدرسه و شیفت از قبل وجود دارد',
        );
      }
    }

    return this.prisma.fieldOfStudy.update({
      where: { id },
      data: {
        name: dto.name ?? field.name,
        schoolType: dto.schoolType ?? field.schoolType,
        shift: dto.shift ?? field.shift,
        isActive:
          typeof dto.isActive === 'boolean' ? dto.isActive : field.isActive,
      },
    });
  }

  async remove(id: number) {
    const field = await this.prisma.fieldOfStudy.findUnique({
      where: { id },
      include: {
        classGroups: true,
      },
    });
    if (!field) {
      throw new NotFoundException('رشته پیدا نشد');
    }

    if (field.classGroups.length > 0) {
      throw new BadRequestException(
        'امکان حذف رشته‌ای که کلاس دارد وجود ندارد',
      );
    }

    await this.prisma.fieldOfStudy.delete({
      where: { id },
    });

    return { success: true };
  }
}
