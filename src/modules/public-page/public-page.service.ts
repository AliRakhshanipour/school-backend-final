// src/modules/public-page/public-page.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicPageService {
  constructor(private readonly prisma: PrismaService) {}

  private now(): Date {
    return new Date();
  }

  // ---------- Sections (PublicPageSection) ----------

  async createSection(dto: {
    sectionKey: string;
    title: string;
    content: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    try {
      return await this.prisma.publicPageSection.create({
        data: {
          sectionKey: dto.sectionKey,
          title: dto.title,
          content: dto.content,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          'کلید این بخش (sectionKey) تکراری است',
        );
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
    const section =
      await this.prisma.publicPageSection.findUnique({
        where: { id },
      });
    if (!section) {
      throw new NotFoundException('بخش پیدا نشد');
    }

    try {
      return await this.prisma.publicPageSection.update({
        where: { id },
        data: {
          sectionKey:
            dto.sectionKey ?? section.sectionKey,
          title: dto.title ?? section.title,
          content: dto.content ?? section.content,
          displayOrder:
            dto.displayOrder ?? section.displayOrder,
          isActive:
            typeof dto.isActive === 'boolean'
              ? dto.isActive
              : section.isActive,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          'کلید این بخش (sectionKey) تکراری است',
        );
      }
      throw e;
    }
  }

  async deleteSection(id: number) {
    const section =
      await this.prisma.publicPageSection.findUnique({
        where: { id },
      });
    if (!section) {
      throw new NotFoundException('بخش پیدا نشد');
    }

    await this.prisma.publicPageSection.delete({
      where: { id },
    });

    return { success: true };
  }

  async adminListSections() {
    return this.prisma.publicPageSection.findMany({
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async adminGetSection(id: number) {
    const section =
      await this.prisma.publicPageSection.findUnique({
        where: { id },
      });
    if (!section) {
      throw new NotFoundException('بخش پیدا نشد');
    }
    return section;
  }

  async publicListSections() {
    return this.prisma.publicPageSection.findMany({
      where: { isActive: true },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async publicGetSectionByKey(sectionKey: string) {
    const section =
      await this.prisma.publicPageSection.findFirst({
        where: {
          sectionKey,
          isActive: true,
        },
      });
    if (!section) {
      throw new NotFoundException(
        'بخش مورد نظر در حال حاضر فعال نیست یا وجود ندارد',
      );
    }
    return section;
  }

  // ---------- Landing Aggregation ----------

  async landingData() {
    const now = this.now();

    const [sections, latestNews, activePreRegWindow] =
      await Promise.all([
        this.publicListSections(),
        this.prisma.newsPost.findMany({
          where: {
            isPublished: true,
            OR: [
              { publishAt: null },
              { publishAt: { lte: now } },
            ],
            AND: [
              {
                OR: [
                  { expireAt: null },
                  { expireAt: { gte: now } },
                ],
              },
            ],
          },
          orderBy: [
            { publishAt: 'desc' },
            { createdAt: 'desc' },
          ],
          take: 5,
        }),
        this.prisma.preRegistrationWindow.findFirst({
          where: {
            isActive: true,
            startAt: { lte: now },
            endAt: { gte: now },
          },
          include: {
            academicYear: true,
          },
        }),
      ]);

    return {
      sections,
      news: latestNews.filter(
        (n) => n.visibility === 'PUBLIC',
      ),
      preRegistration: activePreRegWindow
        ? {
            window: {
              id: activePreRegWindow.id,
              startAt: activePreRegWindow.startAt,
              endAt: activePreRegWindow.endAt,
            },
            academicYear: {
              id: activePreRegWindow.academicYear.id,
              label:
                activePreRegWindow.academicYear.label,
            },
          }
        : null,
    };
  }
}
