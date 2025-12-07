// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * پروفایل کامل کاربر فعلی برای /me
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacher: true,
        student: {
          include: {
            enrollments: {
              include: {
                classGroup: {
                  include: {
                    fieldOfStudy: true,
                    gradeLevel: true,
                    academicYear: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ساختن خروجی تمیز برای فرانت
    const base = {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    };

    if (user.role === UserRole.ADMIN) {
      return {
        ...base,
        profileType: 'ADMIN',
      };
    }

    if (user.role === UserRole.TEACHER && user.teacher) {
      return {
        ...base,
        profileType: 'TEACHER',
        teacher: {
          id: user.teacher.id,
          firstName: user.teacher.firstName,
          lastName: user.teacher.lastName,
          fatherName: user.teacher.fatherName,
          personnelCode: user.teacher.personnelCode,
          nationalId: user.teacher.nationalId,
          educationLevel: user.teacher.educationLevel,
          majorField: user.teacher.majorField,
          workExperienceYears: user.teacher.workExperienceYears,
          address: user.teacher.address,
          phone: user.teacher.phone,
          emergencyPhone: user.teacher.emergencyPhone,
          postalCode: user.teacher.postalCode,
          photoPath: user.teacher.photoPath,
        },
      };
    }

    if (user.role === UserRole.STUDENT && user.student) {
      return {
        ...base,
        profileType: 'STUDENT',
        student: {
          id: user.student.id,
          firstName: user.student.firstName,
          lastName: user.student.lastName,
          fatherName: user.student.fatherName,
          nationalId: user.student.nationalId,
          birthDate: user.student.birthDate,
          livingSituation: user.student.livingSituation,
          hasDisability: user.student.hasDisability,
          hasChronicDisease: user.student.hasChronicDisease,
          hasSpecialMedication: user.student.hasSpecialMedication,
          lastYearAverage: user.student.lastYearAverage,
          photoPath: user.student.photoPath,
          // آخرین ثبت‌نام فعال (اگر بوده)
          currentEnrollment:
            user.student.enrollments.find((e) => e.isActive) ?? null,
        },
      };
    }

    // در صورت نبودن Teacher/Student، فقط اطلاعات پایه
    return {
      ...base,
      profileType: 'UNKNOWN',
    };
  }
}
