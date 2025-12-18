import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { SetStudentEnrollmentDto } from './dto/set-student-enrollment.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import type { Express } from 'express';
import { runTxWithRetry } from '../../common/prisma/tx';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Helpers ----------

  private safeUnlink(filePath?: string | null) {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }

  private async lockClassGroupRow(tx: any, classGroupId: number) {
    await tx.$queryRaw`
      SELECT id FROM "ClassGroup"
      WHERE id = ${classGroupId}
      FOR UPDATE
    `;
  }

  private async lockTwoClassGroupsInOrder(tx: any, a: number, b: number) {
    const x = Math.min(a, b);
    const y = Math.max(a, b);
    await this.lockClassGroupRow(tx, x);
    if (y !== x) await this.lockClassGroupRow(tx, y);
  }

  private async validateEnrollmentReferencesTx(
    tx: any,
    academicYearId: number,
    classGroupId: number,
    excludeEnrollmentId?: number,
  ) {
    const academicYear = await tx.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true },
    });
    if (!academicYear) {
      throw new BadRequestException('سال تحصیلی انتخاب‌شده وجود ندارد');
    }

    const classGroup = await tx.classGroup.findUnique({
      where: { id: classGroupId },
      select: { id: true, academicYearId: true, capacity: true },
    });
    if (!classGroup) {
      throw new BadRequestException('کلاس انتخاب‌شده وجود ندارد');
    }

    if (classGroup.academicYearId !== academicYearId) {
      throw new BadRequestException('کلاس انتخاب‌شده متعلق به این سال تحصیلی نیست');
    }

    const activeCount = await tx.studentEnrollment.count({
      where: {
        academicYearId,
        classGroupId,
        isActive: true,
        ...(excludeEnrollmentId ? { NOT: { id: excludeEnrollmentId } } : {}),
      },
    });

    if (activeCount >= classGroup.capacity) {
      throw new BadRequestException('ظرفیت این کلاس تکمیل شده است');
    }

    return { academicYear, classGroup };
  }

  private async ensureUsernameUnique(username: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new BadRequestException('این نام کاربری قبلاً استفاده شده است');
    }
  }

  private async ensureNationalIdUnique(nationalId: string) {
    const existing = await this.prisma.student.findUnique({ where: { nationalId } });
    if (existing) {
      throw new BadRequestException('این کد ملی قبلاً برای هنرجوی دیگری ثبت شده است');
    }
  }

  private mapLastYearValue(value?: number): Prisma.Decimal | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Prisma.Decimal(value);
  }

  private async validateEnrollmentReferences(academicYearId: number, classGroupId: number) {
    const academicYear = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!academicYear) throw new BadRequestException('سال تحصیلی انتخاب‌شده وجود ندارد');

    const classGroup = await this.prisma.classGroup.findUnique({ where: { id: classGroupId } });
    if (!classGroup) throw new BadRequestException('کلاس انتخاب‌شده وجود ندارد');

    if (classGroup.academicYearId !== academicYearId) {
      throw new BadRequestException('کلاس انتخاب‌شده متعلق به این سال تحصیلی نیست');
    }

    const activeCount = await this.prisma.studentEnrollment.count({
      where: { academicYearId, classGroupId, isActive: true },
    });

    if (activeCount >= classGroup.capacity) {
      throw new BadRequestException('ظرفیت این کلاس تکمیل شده است');
    }

    return { academicYear, classGroup };
  }

  // ---------- Create ----------

  async create(dto: CreateStudentDto) {
    await this.ensureUsernameUnique(dto.username);
    await this.ensureNationalIdUnique(dto.nationalId);

    if (dto.hasDisability && !dto.disabilityDescription) {
      throw new BadRequestException('در صورت داشتن معلولیت، توضیح معلولیت الزامی است');
    }
    if (dto.hasChronicDisease && !dto.chronicDiseaseDescription) {
      throw new BadRequestException('در صورت داشتن بیماری خاص، توضیح بیماری الزامی است');
    }
    if (dto.hasSpecialMedication && !dto.specialMedicationDescription) {
      throw new BadRequestException('در صورت مصرف داروی خاص، توضیح دارو الزامی است');
    }

    const enrollmentData =
      dto.academicYearId && dto.classGroupId
        ? { academicYearId: dto.academicYearId, classGroupId: dto.classGroupId }
        : undefined;

    // چک اولیه (اختیاری) – چک اصلی ظرفیت اگر enrollment بدهند داخل tx و با lock انجام می‌شود
    if (enrollmentData) {
      await this.validateEnrollmentReferences(enrollmentData.academicYearId, enrollmentData.classGroupId);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: dto.username,
            password: hashedPassword,
            role: UserRole.STUDENT,
          },
        });

        if (enrollmentData) {
          await this.lockClassGroupRow(tx, enrollmentData.classGroupId);
          await this.validateEnrollmentReferencesTx(tx, enrollmentData.academicYearId, enrollmentData.classGroupId);
        }

        const createdStudent = await tx.student.create({
          data: {
            userId: user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            fatherName: dto.fatherName,
            nationalId: dto.nationalId,
            livingSituation: dto.livingSituation,
            birthCertificateSeries: dto.birthCertificateSeries ?? null,
            birthDate: new Date(dto.birthDate),
            isLeftHanded: dto.isLeftHanded,
            hasDisability: dto.hasDisability,
            disabilityDescription: dto.disabilityDescription ?? null,
            hasChronicDisease: dto.hasChronicDisease,
            chronicDiseaseDescription: dto.chronicDiseaseDescription ?? null,
            hasSpecialMedication: dto.hasSpecialMedication,
            specialMedicationDescription: dto.specialMedicationDescription ?? null,
            lastYearAverage: this.mapLastYearValue(dto.lastYearAverage) as any,
            lastYearMathScore: this.mapLastYearValue(dto.lastYearMathScore) as any,
            lastYearDisciplineScore: this.mapLastYearValue(dto.lastYearDisciplineScore) as any,
            lastYearEducationLevel: dto.lastYearEducationLevel ?? null,
            previousSchoolName: dto.previousSchoolName ?? null,
            previousSchoolAddress: dto.previousSchoolAddress ?? null,
            previousSchoolPhone: dto.previousSchoolPhone ?? null,
          },
          include: {
            user: { select: { id: true, username: true, role: true, createdAt: true } },
          },
        });

        if (enrollmentData) {
          await tx.studentEnrollment.create({
            data: {
              studentId: createdStudent.id,
              academicYearId: enrollmentData.academicYearId,
              classGroupId: enrollmentData.classGroupId,
              isActive: true,
            },
          });
        }

        return createdStudent;
      });

      return student;
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('اطلاعات تکراری است (نام کاربری یا کد ملی قبلاً ثبت شده)');
      }
      throw e;
    }
  }

  // ---------- List / Get ----------

  async findAll(search?: string, academicYearId?: number, classGroupId?: number) {
    const where: Prisma.StudentWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (academicYearId || classGroupId) {
      where.enrollments = {
        some: {
          ...(academicYearId ? { academicYearId } : {}),
          ...(classGroupId ? { classGroupId } : {}),
          isActive: true,
        },
      };
    }

    return this.prisma.student.findMany({
      where,
      orderBy: { lastName: 'asc' },
      include: {
        user: { select: { id: true, username: true, role: true, createdAt: true } },
        enrollments: {
          include: {
            academicYear: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
          },
        },
        parents: true,
      },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, role: true, createdAt: true } },
        enrollments: {
          include: {
            academicYear: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
          },
        },
        parents: true,
      },
    });

    if (!student) throw new NotFoundException('هنرجو پیدا نشد');
    return student;
  }

  // ---------- Update ----------

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('هنرجو پیدا نشد');

    if (dto.nationalId && dto.nationalId !== student.nationalId) {
      await this.ensureNationalIdUnique(dto.nationalId);
    }

    if (dto.hasDisability && !dto.disabilityDescription) {
      throw new BadRequestException('در صورت داشتن معلولیت، توضیح معلولیت الزامی است');
    }
    if (dto.hasChronicDisease && !dto.chronicDiseaseDescription) {
      throw new BadRequestException('در صورت داشتن بیماری خاص، توضیح بیماری الزامی است');
    }
    if (dto.hasSpecialMedication && !dto.specialMedicationDescription) {
      throw new BadRequestException('در صورت مصرف داروی خاص، توضیح دارو الزامی است');
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        firstName: dto.firstName ?? student.firstName,
        lastName: dto.lastName ?? student.lastName,
        fatherName: dto.fatherName ?? student.fatherName,
        nationalId: dto.nationalId ?? student.nationalId,
        livingSituation: dto.livingSituation ?? student.livingSituation,
        birthCertificateSeries:
          dto.birthCertificateSeries !== undefined ? dto.birthCertificateSeries : student.birthCertificateSeries,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : student.birthDate,
        isLeftHanded: dto.isLeftHanded ?? student.isLeftHanded,
        hasDisability: dto.hasDisability ?? student.hasDisability,
        disabilityDescription:
          dto.disabilityDescription !== undefined ? dto.disabilityDescription : student.disabilityDescription,
        hasChronicDisease: dto.hasChronicDisease ?? student.hasChronicDisease,
        chronicDiseaseDescription:
          dto.chronicDiseaseDescription !== undefined ? dto.chronicDiseaseDescription : student.chronicDiseaseDescription,
        hasSpecialMedication: dto.hasSpecialMedication ?? student.hasSpecialMedication,
        specialMedicationDescription:
          dto.specialMedicationDescription !== undefined
            ? dto.specialMedicationDescription
            : student.specialMedicationDescription,
        lastYearAverage:
          dto.lastYearAverage !== undefined ? (this.mapLastYearValue(dto.lastYearAverage) as any) : student.lastYearAverage,
        lastYearMathScore:
          dto.lastYearMathScore !== undefined
            ? (this.mapLastYearValue(dto.lastYearMathScore) as any)
            : student.lastYearMathScore,
        lastYearDisciplineScore:
          dto.lastYearDisciplineScore !== undefined
            ? (this.mapLastYearValue(dto.lastYearDisciplineScore) as any)
            : student.lastYearDisciplineScore,
        lastYearEducationLevel:
          dto.lastYearEducationLevel !== undefined ? dto.lastYearEducationLevel : student.lastYearEducationLevel,
        previousSchoolName:
          dto.previousSchoolName !== undefined ? dto.previousSchoolName : student.previousSchoolName,
        previousSchoolAddress:
          dto.previousSchoolAddress !== undefined ? dto.previousSchoolAddress : student.previousSchoolAddress,
        previousSchoolPhone:
          dto.previousSchoolPhone !== undefined ? dto.previousSchoolPhone : student.previousSchoolPhone,
      },
      include: {
        user: { select: { id: true, username: true, role: true, createdAt: true } },
      },
    });
  }

  // ---------- Enrollment (Concurrency-safe) ----------

  async setEnrollment(id: string, dto: SetStudentEnrollmentDto) {
    return runTxWithRetry(this.prisma, async (tx) => {
      const student = await tx.student.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!student) throw new NotFoundException('هنرجو پیدا نشد');

      const existing = await tx.studentEnrollment.findUnique({
        where: {
          studentId_academicYearId: { studentId: id, academicYearId: dto.academicYearId },
        },
        select: { id: true, classGroupId: true, isActive: true },
      });

      if (existing && existing.classGroupId !== dto.classGroupId) {
        await this.lockTwoClassGroupsInOrder(tx, existing.classGroupId, dto.classGroupId);
      } else {
        await this.lockClassGroupRow(tx, dto.classGroupId);
      }

      await this.validateEnrollmentReferencesTx(
        tx,
        dto.academicYearId,
        dto.classGroupId,
        existing?.id,
      );

      if (existing && existing.classGroupId === dto.classGroupId && existing.isActive) {
        return tx.studentEnrollment.findUnique({
          where: { id: existing.id },
          include: {
            academicYear: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
          },
        });
      }

      return tx.studentEnrollment.upsert({
        where: {
          studentId_academicYearId: { studentId: id, academicYearId: dto.academicYearId },
        },
        update: { classGroupId: dto.classGroupId, isActive: true },
        create: {
          studentId: id,
          academicYearId: dto.academicYearId,
          classGroupId: dto.classGroupId,
          isActive: true,
        },
        include: {
          academicYear: true,
          classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
        },
      });
    });
  }

  // ---------- Remove ----------

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        studentAttendances: true,
        workshopScores: true,
        theoryExamResults: true,
        preRegistrations: true,
        parents: true,
        user: true,
      },
    });

    if (!student) throw new NotFoundException('هنرجو پیدا نشد');

    if (student.studentAttendances.length > 0 || student.workshopScores.length > 0 || student.theoryExamResults.length > 0) {
      throw new BadRequestException(
        'برای این هنرجو داده‌های آموزشی ثبت شده است و امکان حذف فیزیکی وجود ندارد. می‌توانید آن را غیرفعال کنید.',
      );
    }

    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const photoAbs = student.photoPath ? path.join(uploadsRoot, student.photoPath) : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.parent.deleteMany({ where: { studentId: id } });
      await tx.studentEnrollment.deleteMany({ where: { studentId: id } });
      await tx.preRegistration.updateMany({ where: { studentId: id }, data: { studentId: null } });
      await tx.student.delete({ where: { id } });
      await tx.user.delete({ where: { id: student.userId } });
    });

    this.safeUnlink(photoAbs);
    return { success: true };
  }

  // ---------- Photo Management ----------

  async updatePhoto(studentId: string, file: Express.Multer.File) {
    const uploadsRoot = path.join(process.cwd(), 'uploads');

    const cleanupNewFile = () => {
      if (file?.path) this.safeUnlink(file.path);
    };

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      cleanupNewFile();
      throw new NotFoundException('هنرجو پیدا نشد');
    }

    const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');
    const oldPhotoAbs = student.photoPath ? path.join(uploadsRoot, student.photoPath) : null;

    try {
      const updated = await this.prisma.student.update({
        where: { id: studentId },
        data: { photoPath: relativePath, photoUpdatedAt: new Date() },
        include: { user: { select: { id: true, username: true, role: true } } },
      });

      this.safeUnlink(oldPhotoAbs);
      return updated;
    } catch (e) {
      cleanupNewFile();
      throw e;
    }
  }

  // ---------- Parents Management ----------

  async addParent(studentId: string, dto: CreateParentDto) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('هنرجو پیدا نشد');

    if (dto.hasWarParticipation && dto.veteranPercent == null) {
      throw new BadRequestException('در صورت داشتن سابقه ایثارگری، درصد جانبازی الزامی است');
    }

    return this.prisma.parent.create({
      data: {
        studentId,
        relation: dto.relation,
        firstName: dto.firstName,
        lastName: dto.lastName,
        nationalId: dto.nationalId ?? null,
        birthCertificateNumber: dto.birthCertificateNumber ?? null,
        mobilePhone: dto.mobilePhone ?? null,
        educationLevel: dto.educationLevel ?? null,
        jobTitle: dto.jobTitle ?? null,
        birthPlace: dto.birthPlace ?? null,
        idCardIssuePlace: dto.idCardIssuePlace ?? null,
        isAlive: dto.isAlive !== undefined ? dto.isAlive : true,
        homeAddress: dto.homeAddress ?? null,
        workAddress: dto.workAddress ?? null,
        workPhone: dto.workPhone ?? null,
        hasWarParticipation: dto.hasWarParticipation ?? false,
        veteranPercent: dto.veteranPercent ?? null,
      },
    });
  }

  async updateParent(studentId: string, parentId: string, dto: UpdateParentDto) {
    const parent = await this.prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent || parent.studentId !== studentId) {
      throw new NotFoundException('ولی/والد مورد نظر پیدا نشد');
    }

    if (dto.hasWarParticipation && dto.veteranPercent == null) {
      throw new BadRequestException('در صورت داشتن سابقه ایثارگری، درصد جانبازی الزامی است');
    }

    return this.prisma.parent.update({
      where: { id: parentId },
      data: {
        relation: dto.relation ?? parent.relation,
        firstName: dto.firstName ?? parent.firstName,
        lastName: dto.lastName ?? parent.lastName,
        nationalId: dto.nationalId !== undefined ? dto.nationalId : parent.nationalId,
        birthCertificateNumber:
          dto.birthCertificateNumber !== undefined ? dto.birthCertificateNumber : parent.birthCertificateNumber,
        mobilePhone: dto.mobilePhone !== undefined ? dto.mobilePhone : parent.mobilePhone,
        educationLevel: dto.educationLevel !== undefined ? dto.educationLevel : parent.educationLevel,
        jobTitle: dto.jobTitle !== undefined ? dto.jobTitle : parent.jobTitle,
        birthPlace: dto.birthPlace !== undefined ? dto.birthPlace : parent.birthPlace,
        idCardIssuePlace: dto.idCardIssuePlace !== undefined ? dto.idCardIssuePlace : parent.idCardIssuePlace,
        isAlive: dto.isAlive !== undefined ? dto.isAlive : parent.isAlive,
        homeAddress: dto.homeAddress !== undefined ? dto.homeAddress : parent.homeAddress,
        workAddress: dto.workAddress !== undefined ? dto.workAddress : parent.workAddress,
        workPhone: dto.workPhone !== undefined ? dto.workPhone : parent.workPhone,
        hasWarParticipation:
          dto.hasWarParticipation !== undefined ? dto.hasWarParticipation : parent.hasWarParticipation,
        veteranPercent: dto.veteranPercent !== undefined ? dto.veteranPercent : parent.veteranPercent,
      },
    });
  }

  async removeParent(studentId: string, parentId: string) {
    const parent = await this.prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent || parent.studentId !== studentId) {
      throw new NotFoundException('ولی/والد مورد نظر پیدا نشد');
    }
    await this.prisma.parent.delete({ where: { id: parentId } });
    return { success: true };
  }

  // ---------- Student Self Profile ----------

  async getProfileByUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        enrollments: {
          include: {
            academicYear: true,
            classGroup: { include: { fieldOfStudy: true, gradeLevel: true } },
          },
        },
        parents: true,
      },
    });

    if (!student) {
      throw new ForbiddenException('فقط هنرجوها به این مسیر دسترسی دارند');
    }

    return student;
  }
}
