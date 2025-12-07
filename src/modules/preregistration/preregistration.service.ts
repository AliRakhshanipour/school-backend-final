import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreatePreRegistrationDto } from './dto/create-preregistration.dto';
import {
  PreRegistrationStatus,
  LivingSituation,
} from '@prisma/client';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { CheckStatusDto } from './dto/check-status.dto';
import { PreRegistrationStatusResponseDto } from './dto/status-response.dto';
import { PreRegistrationWindowStatusDto } from './dto/window-status.dto';

@Injectable()
export class PreRegistrationService {
  private readonly uploadRoot: string;
  private readonly preregDir: string;
  private readonly maxPhotoSizeBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.uploadRoot = this.configService.get<string>('upload.root') ?? './uploads';
    this.preregDir =
      this.configService.get<string>('upload.preregDir') ??
      'preregistrations';

    const maxKb =
      this.configService.get<number>('upload.maxProfileSizeKb') ?? 200;
    this.maxPhotoSizeBytes = maxKb * 1024;
  }

  // ---------- Helpers for FS ----------

  private getPendingPhotoPath(id: string, ext: string) {
    const rel = path.join(this.preregDir, 'pending', `${id}${ext}`);
    return {
      relative: rel,
      absolute: path.join(this.uploadRoot, rel),
    };
  }

  private getAcceptedPhotoPath(id: string, ext: string) {
    const rel = path.join(this.preregDir, 'accepted', `${id}${ext}`);
    return {
      relative: rel,
      absolute: path.join(this.uploadRoot, rel),
    };
  }

  private async ensureDir(dirPath: string) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  private getFileExtension(file: Express.Multer.File): string {
    const orig = file.originalname;
    const ext = path.extname(orig).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      return ext;
    }
    throw new BadRequestException('فرمت فایل عکس باید jpg یا png باشد');
  }

  private async savePendingPhoto(
    preregId: string,
    file: Express.Multer.File,
  ): Promise<{ relative: string; absolute: string }> {
    if (file.size > this.maxPhotoSizeBytes) {
      throw new BadRequestException(
        `حجم فایل عکس نباید بیشتر از ${
          this.maxPhotoSizeBytes / 1024
        } کیلوبایت باشد`,
      );
    }

    const ext = this.getFileExtension(file);
    const { relative, absolute } = this.getPendingPhotoPath(preregId, ext);

    await this.ensureDir(path.dirname(absolute));
    await fs.promises.writeFile(absolute, file.buffer);

    return { relative, absolute };
  }

  private async movePhotoToAccepted(photoPath: string): Promise<string> {
    // photoPath شکلش شبیه "preregistrations/pending/<id>.jpg"
    const absOld = path.join(this.uploadRoot, photoPath);
    const ext = path.extname(photoPath);
    const baseName = path.basename(photoPath, ext); // id
    const { relative: newRel, absolute: newAbs } =
      this.getAcceptedPhotoPath(baseName, ext);

    await this.ensureDir(path.dirname(newAbs));

    // اگر فایل قدیمی وجود ندارد، چیزی حرکت نمی‌دهیم
    try {
      await fs.promises.rename(absOld, newAbs);
    } catch {
      // ممکن است قبلاً حذف شده باشد؛ خطا نمی‌دهیم
    }

    return newRel;
  }

  private async deletePhotoIfExists(photoPath?: string | null) {
    if (!photoPath) return;
    const abs = path.join(this.uploadRoot, photoPath);
    try {
      await fs.promises.unlink(abs);
    } catch {
      // اگر موجود نبود، مهم نیست
    }
  }

  // ---------- Business Logic ----------

  /**
   * پیدا کردن پنجره فعال پیش‌ثبت‌نام (اگر وجود داشته باشد)
   */
  async getActiveWindow(): Promise<PreRegistrationWindowStatusDto> {
    const now = new Date();

    const window = await this.prisma.preRegistrationWindow.findFirst({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        academicYear: true,
      },
      orderBy: {
        startAt: 'desc',
      },
    });

    if (!window) {
      return {
        isOpen: false,
      };
    }

    return {
      isOpen: true,
      academicYearLabel: window.academicYear.label,
      startAt: window.startAt,
      endAt: window.endAt,
    };
  }

  /**
   * ایجاد پیش‌ثبت‌نام از سمت صفحه عمومی
   */
  async createPublicPreRegistration(
    dto: CreatePreRegistrationDto,
    file?: Express.Multer.File,
  ) {
    // 1) چک باز بودن پنجره
    const now = new Date();
    const window = await this.prisma.preRegistrationWindow.findFirst({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      orderBy: { startAt: 'desc' },
    });

    if (!window) {
      throw new BadRequestException('در حال حاضر پیش‌ثبت‌نام فعال نیست');
    }

    // 2) جلوگیری از ثبت‌نام تکراری در همان سال تحصیلی
    const existing = await this.prisma.preRegistration.findUnique({
      where: {
        nationalId_academicYearId: {
          nationalId: dto.nationalId,
          academicYearId: window.academicYearId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'برای این کد ملی در این سال تحصیلی قبلاً پیش‌ثبت‌نام انجام شده است',
      );
    }

    const birthDate = new Date(dto.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('تاریخ تولد نامعتبر است');
    }

    // 3) ساخت رکورد در DB (فعلاً بدون عکس)
    const created = await this.prisma.preRegistration.create({
      data: {
        academicYearId: window.academicYearId,
        status: PreRegistrationStatus.PENDING,
        contactPhone: dto.contactPhone,

        firstName: dto.firstName,
        lastName: dto.lastName,
        nationalId: dto.nationalId,
        fatherName: dto.fatherName,
        livingSituation: dto.livingSituation as LivingSituation,
        birthDate,
        birthCertificateSeries: dto.birthCertificateSeries ?? null,
        isLeftHanded: dto.isLeftHanded,
        hasDisability: dto.hasDisability,
        disabilityDescription: dto.disabilityDescription ?? null,
        hasChronicDisease: dto.hasChronicDisease,
        chronicDiseaseDescription: dto.chronicDiseaseDescription ?? null,
        hasSpecialMedication: dto.hasSpecialMedication,
        specialMedicationDescription:
          dto.specialMedicationDescription ?? null,
        lastYearAverage: dto.lastYearAverage ?? null,
        lastYearMathScore: dto.lastYearMathScore ?? null,
        lastYearDisciplineScore: dto.lastYearDisciplineScore ?? null,
        lastYearEducationLevel: dto.lastYearEducationLevel ?? null,
        previousSchoolName: dto.previousSchoolName ?? null,
        previousSchoolAddress: dto.previousSchoolAddress ?? null,
        previousSchoolPhone: dto.previousSchoolPhone ?? null,
        requestedFieldOfStudyId: dto.requestedFieldOfStudyId ?? null,

        parents: {
          create: dto.parents.map((p) => ({
            relation: p.relation,
            firstName: p.firstName,
            lastName: p.lastName,
            nationalId: p.nationalId ?? null,
            birthCertificateNumber: p.birthCertificateNumber ?? null,
            mobilePhone: p.mobilePhone ?? null,
            educationLevel: p.educationLevel ?? null,
            jobTitle: p.jobTitle ?? null,
            birthPlace: p.birthPlace ?? null,
            idCardIssuePlace: p.idCardIssuePlace ?? null,
            homeAddress: p.homeAddress ?? null,
            workAddress: p.workAddress ?? null,
            workPhone: p.workPhone ?? null,
            hasWarParticipation: p.hasWarParticipation ?? false,
            veteranPercent: p.veteranPercent ?? null,
          })),
        },
      },
    });

    // 4) ذخیره عکس (اگر ارسال شده)
    let finalPhotoPath: string | null = null;

    if (file) {
      try {
        const { relative } = await this.savePendingPhoto(created.id, file);
        const updated = await this.prisma.preRegistration.update({
          where: { id: created.id },
          data: {
            photoPath: relative,
            photoUpdatedAt: new Date(),
          },
        });
        finalPhotoPath = updated.photoPath;
      } catch (err) {
        // اگر ذخیره عکس شکست خورد، رکورد را هم پاک می‌کنیم
        await this.prisma.preRegistration.delete({
          where: { id: created.id },
        });
        throw err;
      }
    }

    return {
      id: created.id,
      status: created.status,
      academicYearId: created.academicYearId,
      contactPhone: created.contactPhone,
      photoPath: finalPhotoPath,
    };
  }

  /**
   * چک وضعیت پیش‌ثبت‌نام با کد ملی + شماره تماس
   */
  async checkStatus(
    dto: CheckStatusDto,
  ): Promise<PreRegistrationStatusResponseDto> {
    const prereg = await this.prisma.preRegistration.findFirst({
      where: {
        nationalId: dto.nationalId,
        contactPhone: dto.contactPhone,
      },
      include: {
        academicYear: true,
        admittedFieldOfStudy: true,
        assignedClassGroup: {
          include: {
            gradeLevel: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!prereg) {
      return {
        status: PreRegistrationStatus.PENDING,
        message: 'هیچ پیش‌ثبت‌نامی با این مشخصات پیدا نشد',
      };
    }

    const base: PreRegistrationStatusResponseDto = {
      status: prereg.status,
      message: '',
    };

    if (prereg.status === PreRegistrationStatus.PENDING) {
      base.message = 'درخواست شما ثبت شده است؛ نتیجه هنوز آماده نیست.';
      return base;
    }

    if (prereg.status === PreRegistrationStatus.REJECTED) {
      base.message = 'متأسفانه درخواست شما در این مدرسه پذیرفته نشده است.';
      return base;
    }

    if (prereg.status === PreRegistrationStatus.RESERVED) {
      base.message =
        'درخواست شما در وضعیت رزرو است؛ در صورت آزاد شدن ظرفیت با شما تماس گرفته خواهد شد.';
      return base;
    }

    // ACCEPTED
    if (prereg.status === PreRegistrationStatus.ACCEPTED) {
      base.academicYearLabel = prereg.academicYear?.label;

      if (!prereg.admittedFieldOfStudy || !prereg.assignedClassGroup) {
        base.message =
          'شما پذیرفته شده‌اید، اما رشته یا کلاس نهایی هنوز در سیستم ثبت نشده است.';
        return base;
      }

      base.fieldOfStudyName = prereg.admittedFieldOfStudy.name;
      base.schoolType = prereg.admittedFieldOfStudy.schoolType;
      base.shift = prereg.admittedFieldOfStudy.shift;
      base.classCode = prereg.assignedClassGroup.code;
      base.gradeLevel = prereg.assignedClassGroup.gradeLevel?.name;

      base.message =
        'شما پذیرفته شده‌اید. اطلاعات رشته و کلاس در ادامه آمده است.';
      return base;
    }

    return base;
  }

  /**
   * تغییر وضعیت پیش‌ثبت‌نام توسط مدیر/معاون (قبول/رد/رزرو)
   * و جابجایی عکس به فولدر accepted در صورت قبولی
   */
  async adminUpdateStatus(
    id: string,
    newStatus: PreRegistrationStatus,
    admittedFieldOfStudyId?: number,
    assignedClassGroupId?: number,
  ) {
    const prereg = await this.prisma.preRegistration.findUnique({
      where: { id },
      include: {
        academicYear: true,
        admittedFieldOfStudy: true,
        requestedFieldOfStudy: true,
        assignedClassGroup: {
          include: {
            fieldOfStudy: true,
          },
        },
      },
    });

    if (!prereg) {
      throw new NotFoundException('پیش‌ثبت‌نام پیدا نشد');
    }

    // اگر قبلاً Student مرتبط دارد، اینجا فعلاً تغییری نمی‌دهیم (بعداً در ماژول ثبت‌نام نهایی)
    if (newStatus === PreRegistrationStatus.ACCEPTED) {
      if (!admittedFieldOfStudyId || !assignedClassGroupId) {
        throw new BadRequestException(
          'برای پذیرش، تعیین رشته قبولی و کلاس الزامی است',
        );
      }

      const field = await this.prisma.fieldOfStudy.findUnique({
        where: { id: admittedFieldOfStudyId },
      });
      if (!field) {
        throw new BadRequestException('رشته انتخابی وجود ندارد');
      }

      const classGroup = await this.prisma.classGroup.findUnique({
        where: { id: assignedClassGroupId },
      });
      if (!classGroup) {
        throw new BadRequestException('کلاس انتخابی وجود ندارد');
      }

      if (classGroup.academicYearId !== prereg.academicYearId) {
        throw new BadRequestException(
          'کلاس انتخابی مربوط به همان سال تحصیلی نیست',
        );
      }

      if (classGroup.fieldOfStudyId !== field.id) {
        throw new BadRequestException(
          'کلاس انتخابی متعلق به همین رشته نیست',
        );
      }

      // جابجایی عکس در صورت وجود
      let newPhotoPath: string | null = prereg.photoPath ?? null;

      if (prereg.photoPath) {
        newPhotoPath = await this.movePhotoToAccepted(prereg.photoPath);
      }

      const updated = await this.prisma.preRegistration.update({
        where: { id },
        data: {
          status: newStatus,
          admittedFieldOfStudyId: field.id,
          assignedClassGroupId: classGroup.id,
          photoPath: newPhotoPath,
          photoUpdatedAt: newPhotoPath ? new Date() : prereg.photoUpdatedAt,
        },
      });

      return updated;
    }

    // سایر وضعیت‌ها: فقط آپدیت ساده
    const updated = await this.prisma.preRegistration.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });

    return updated;
  }

  /**
   * حذف کامل پیش‌ثبت‌نام (مثلاً برای ردشده‌ها)
   * عکس هم باید از روی سرور حذف شود
   */
  async adminDelete(id: string) {
    const prereg = await this.prisma.preRegistration.findUnique({
      where: { id },
    });
    if (!prereg) {
      throw new NotFoundException('پیش‌ثبت‌نام پیدا نشد');
    }

    if (prereg.status === PreRegistrationStatus.ACCEPTED) {
      throw new BadRequestException(
        'امکان حذف پیش‌ثبت‌نام پذیرفته‌شده وجود ندارد',
      );
    }

    // اول عکس را حذف می‌کنیم
    await this.deletePhotoIfExists(prereg.photoPath);

    // سپس رکورد را حذف می‌کنیم (والدین با onDelete: Cascade خودکار حذف می‌شوند)
    await this.prisma.preRegistration.delete({
      where: { id },
    });

    return { success: true };
  }
}
