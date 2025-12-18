// src/modules/news/news.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NewsVisibility,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  // --------- helpers ---------

  private slugify(title: string): string {
    return title
      .trim()
      .toLowerCase()
      // فاصله‌ها -> -
      .replace(/\s+/g, '-')
      // حذف کاراکترهای غیر مجاز (حروف لاتین، ارقام، خط تیره و حروف فارسی)
      .replace(/[^a-z0-9\-\u0600-\u06FF]/g, '')
      .replace(/-+/g, '-');
  }

  private now(): Date {
    return new Date();
  }

  private visibilityFilterForUser(role?: UserRole) {
    if (!role) {
      // مهمان / بدون لاگین
      return { visibility: NewsVisibility.PUBLIC } as Prisma.NewsPostWhereInput;
    }

    if (role === UserRole.ADMIN) {
      return {
        visibility: {
          in: [
            NewsVisibility.PUBLIC,
            NewsVisibility.LOGGED_IN,
            NewsVisibility.STUDENTS,
            NewsVisibility.TEACHERS,
            NewsVisibility.ADMINS,
          ],
        },
      } satisfies Prisma.NewsPostWhereInput;
    }

    if (role === UserRole.TEACHER) {
      return {
        visibility: {
          in: [
            NewsVisibility.PUBLIC,
            NewsVisibility.LOGGED_IN,
            NewsVisibility.TEACHERS,
          ],
        },
      } satisfies Prisma.NewsPostWhereInput;
    }

    if (role === UserRole.STUDENT) {
      return {
        visibility: {
          in: [
            NewsVisibility.PUBLIC,
            NewsVisibility.LOGGED_IN,
            NewsVisibility.STUDENTS,
          ],
        },
      } satisfies Prisma.NewsPostWhereInput;
    }

    // پیش‌فرض
    return { visibility: NewsVisibility.PUBLIC } as Prisma.NewsPostWhereInput;
  }

  private publishWindowFilter() {
    const now = this.now();
    return {
      isPublished: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      AND: [
        {
          OR: [{ expireAt: null }, { expireAt: { gte: now } }],
        },
      ],
    } satisfies Prisma.NewsPostWhereInput;
  }

  // --------- admin CRUD ---------

  async createNews(authorUserId: string, dto: {
    title: string;
    slug?: string;
    summary?: string;
    content: string;
    visibility?: NewsVisibility;
    isPublished?: boolean;
    publishAt?: string;
    expireAt?: string;
  }) {
    let slug = dto.slug?.trim();
    if (!slug) {
      slug = this.slugify(dto.title);
    }

    const publishAt =
      dto.publishAt ? new Date(dto.publishAt) : undefined;
    const expireAt =
      dto.expireAt ? new Date(dto.expireAt) : undefined;

    if (publishAt && expireAt && expireAt <= publishAt) {
      throw new BadRequestException(
        'تاریخ پایان نمایش باید بعد از تاریخ شروع باشد',
      );
    }

    const isPublished = dto.isPublished ?? false;
    const finalPublishAt =
      isPublished && !publishAt ? this.now() : publishAt;

    try {
      return await this.prisma.newsPost.create({
        data: {
          title: dto.title,
          slug,
          summary: dto.summary ?? null,
          content: dto.content,
          visibility: dto.visibility ?? NewsVisibility.PUBLIC,
          isPublished,
          publishAt: finalPublishAt ?? null,
          expireAt: expireAt ?? null,
          authorUserId,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          'اسلاگ خبر تکراری است. لطفاً اسلاگ دیگری انتخاب کنید.',
        );
      }
      throw e;
    }
  }

  async updateNews(id: number, dto: {
    title?: string;
    slug?: string;
    summary?: string | null;
    content?: string;
    visibility?: NewsVisibility;
    isPublished?: boolean;
    publishAt?: string | null;
    expireAt?: string | null;
  }) {
    const existing = await this.prisma.newsPost.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('خبر پیدا نشد');
    }

    let slug: string | undefined;
    if (dto.slug !== undefined) {
      slug = dto.slug ? dto.slug.trim() : existing.slug;
    }

    let publishAt: Date | null | undefined = undefined;
    if (dto.publishAt !== undefined) {
      publishAt =
        dto.publishAt === null
          ? null
          : new Date(dto.publishAt);
    }

    let expireAt: Date | null | undefined = undefined;
    if (dto.expireAt !== undefined) {
      expireAt =
        dto.expireAt === null
          ? null
          : new Date(dto.expireAt);
    }

    const isPublished =
      dto.isPublished !== undefined
        ? dto.isPublished
        : existing.isPublished;

    const finalPublishAt =
      publishAt !== undefined
        ? publishAt
        : existing.publishAt;

    if (
      finalPublishAt &&
      expireAt !== undefined &&
      expireAt !== null &&
      expireAt <= finalPublishAt
    ) {
      throw new BadRequestException(
        'تاریخ پایان نمایش باید بعد از تاریخ شروع باشد',
      );
    }

    try {
      return await this.prisma.newsPost.update({
        where: { id },
        data: {
          title: dto.title ?? existing.title,
          slug: slug ?? existing.slug,
          summary:
            dto.summary !== undefined
              ? dto.summary
              : existing.summary,
          content: dto.content ?? existing.content,
          visibility:
            dto.visibility ?? existing.visibility,
          isPublished,
          publishAt: finalPublishAt,
          expireAt:
            expireAt !== undefined ? expireAt : existing.expireAt,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          'اسلاگ خبر تکراری است',
        );
      }
      throw e;
    }
  }

  async deleteNews(id: number) {
    const existing = await this.prisma.newsPost.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('خبر پیدا نشد');
    }

    await this.prisma.newsPost.delete({
      where: { id },
    });

    return { success: true };
  }

  async adminList(params?: {
    search?: string;
    visibility?: NewsVisibility;
    isPublished?: boolean;
  }) {
    const where: Prisma.NewsPostWhereInput = {};

    if (params?.search) {
      where.OR = [
        {
          title: {
            contains: params.search,
            mode: 'insensitive',
          },
        },
        {
          summary: {
            contains: params.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (params?.visibility) {
      where.visibility = params.visibility;
    }

    if (typeof params?.isPublished === 'boolean') {
      where.isPublished = params.isPublished;
    }

    return this.prisma.newsPost.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async adminGet(id: number) {
    const news = await this.prisma.newsPost.findUnique({
      where: { id },
    });
    if (!news) {
      throw new NotFoundException('خبر پیدا نشد');
    }
    return news;
  }

  // --------- Public & User feeds ---------

  async publicList(limit = 10) {
    const where: Prisma.NewsPostWhereInput = {
      ...this.publishWindowFilter(),
      visibility: NewsVisibility.PUBLIC,
    };

    return this.prisma.newsPost.findMany({
      where,
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async publicGetBySlug(slug: string) {
    const where: Prisma.NewsPostWhereInput = {
      slug,
      ...this.publishWindowFilter(),
      visibility: NewsVisibility.PUBLIC,
    };

    const news = await this.prisma.newsPost.findFirst({
      where,
    });
    if (!news) {
      throw new NotFoundException('خبر پیدا نشد یا منتشر نشده است');
    }

    return news;
  }

  async userFeed(userRole: UserRole, limit = 20) {
    const where: Prisma.NewsPostWhereInput = {
      ...this.publishWindowFilter(),
      ...this.visibilityFilterForUser(userRole),
    };

    return this.prisma.newsPost.findMany({
      where,
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }
}
