import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicPageService {
  constructor(private readonly prisma: PrismaService) {}

  private now(): Date {
    return new Date();
  }

  private normalizeSectionKey(raw: string): string {
    const v = (raw ?? '').toString().trim().toLowerCase();
    if (!v) throw new BadRequestException('sectionKey الزامی است');
    if (!/^[a-z0-9_-]+$/.test(v)) {
      throw new BadRequestException(
        'sectionKey نامعتبر است (فقط a-z, 0-9, _ و - مجاز است)',
      );
    }
    return v;
  }

  private publishWindowFilter(now: Date) {
    return {
      isPublished: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      AND: [{ OR: [{ expireAt: null }, { expireAt: { gte: now } }] }],
    } satisfies Prisma.NewsPostWhereInput;
  }

  // ---------- Sections ----------

  async createSection(dto: {
    sectionKey: string;
    title: string;
    content: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const sectionKey = this.normalizeSectionKey(dto.sectionKey);

    try {
      return await this.prisma.publicPageSection.create({
        data: {
          sectionKey,
          title: dto.title?.trim(),
          content: dto.content, // نکته: اگر HTML رندر می‌کنید، در فرانت sanitize کنید
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('کلید این بخش (sectionKey) تکراری است');
      }
      throw e;
    }
  }

  async updateSection(
    id: number,
    dto: Partial<{
      sectionKey: string;
      title: string;
      content: string;
      displayOrder?: number;
      isActive?: boolean;
    }>,
  ) {
    const section = await this.prisma.publicPageSection.findUnique({
      where: { id },
    });
    if (!section) throw new NotFoundException('بخش پیدا نشد');

    const nextKey =
      dto.sectionKey !== undefined
        ? this.normalizeSectionKey(dto.sectionKey)
        : section.sectionKey;

    try {
      return await this.prisma.publicPageSection.update({
        where: { id },
        data: {
          sectionKey: nextKey,
          title: dto.title !== undefined ? dto.title.trim() : section.title,
          content: dto.content !== undefined ? dto.content : section.content,
          displayOrder:
            dto.displayOrder !== undefined ? dto.displayOrder : section.displayOrder,
          isActive:
            typeof dto.isActive === 'boolean' ? dto.isActive : section.isActive,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('کلید این بخش (sectionKey) تکراری است');
      }
      throw e;
    }
  }

  async deleteSection(id: number) {
    const section = await this.prisma.publicPageSection.findUnique({
      where: { id },
    });
    if (!section) throw new NotFoundException('بخش پیدا نشد');

    await this.prisma.publicPageSection.delete({ where: { id } });
    return { success: true };
  }

  async adminListSections() {
    return this.prisma.publicPageSection.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async adminGetSection(id: number) {
    const section = await this.prisma.publicPageSection.findUnique({
      where: { id },
    });
    if (!section) throw new NotFoundException('بخش پیدا نشد');
    return section;
  }

  async publicListSections() {
    return this.prisma.publicPageSection.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async publicGetSectionByKey(sectionKey: string) {
    const key = this.normalizeSectionKey(sectionKey);

    const section = await this.prisma.publicPageSection.findFirst({
      where: { sectionKey: key, isActive: true },
    });
    if (!section) {
      throw new NotFoundException('بخش مورد نظر در حال حاضر فعال نیست یا وجود ندارد');
    }
    return section;
  }

  // ---------- Landing Aggregation ----------

  async landingData() {
    const now = this.now();

    const [sections, latestPublicNews, activePreRegWindow] = await Promise.all([
      this.publicListSections(),

      // ✅ از DB فقط خبرهای PUBLIC را می‌گیریم (نه اینکه بعداً فیلتر کنیم)
      this.prisma.newsPost.findMany({
        where: {
          ...this.publishWindowFilter(now),
          visibility: NewsVisibility.PUBLIC,
        },
        orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // ✅ orderBy برای انتخاب مطمئن‌ترین پنجره
      this.prisma.preRegistrationWindow.findFirst({
        where: {
          isActive: true,
          startAt: { lte: now },
          endAt: { gte: now },
        },
        include: { academicYear: true },
        orderBy: { startAt: 'desc' },
      }),
    ]);

    return {
      sections,
      news: latestPublicNews,
      preRegistration: activePreRegWindow
        ? {
            window: {
              id: activePreRegWindow.id,
              startAt: activePreRegWindow.startAt,
              endAt: activePreRegWindow.endAt,
            },
            academicYear: {
              id: activePreRegWindow.academicYear.id,
              label: activePreRegWindow.academicYear.label,
            },
          }
        : null,
    };
  }
}
