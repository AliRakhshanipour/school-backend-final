// prisma/seed.ts
import { PrismaClient, UserRole, EducationLevel, LivingSituation, SchoolType, ShiftType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // 1) ادمین اصلی
  const adminPassword = await argon2.hash('Admin1234!');
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // 2) معلم نمونه
  const teacherPassword = await argon2.hash('Teacher1234!');
  const teacherUser = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {},
    create: {
      username: 'teacher1',
      password: teacherPassword,
      role: UserRole.TEACHER,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      firstName: 'علی',
      lastName: 'معلمی',
      fatherName: 'حسن',
      personnelCode: 'T-1001',
      nationalId: '1234567890',
      educationLevel: EducationLevel.BACHELOR,
      majorField: 'برق صنعتی',
      workExperienceYears: 5,
      address: 'تهران، ...',
      phone: '09120000000',
      emergencyPhone: '09123333333',
      postalCode: '1234567890',
    },
  });

  // 3) یک رشته نمونه + سال تحصیلی + پایه + کلاس برای تست هنرجو
  const academicYear = await prisma.academicYear.upsert({
    where: { label: '1403-1404' },
    update: {},
    create: {
      label: '1403-1404',
      startDate: new Date('2024-09-22'),
      endDate: new Date('2025-06-21'),
    },
  });

  const grade10 = await prisma.gradeLevel.upsert({
    where: { name: '10' },
    update: {},
    create: {
      name: '10',
      order: 1,
    },
  });

  const electricMorning = await prisma.fieldOfStudy.upsert({
    where: {
      name_schoolType_shift: {
        name: 'برق صنعتی',
        schoolType: SchoolType.TECHNICAL_VOCATIONAL,
        shift: ShiftType.MORNING,
      },
    },
    update: {},
    create: {
      name: 'برق صنعتی',
      schoolType: SchoolType.TECHNICAL_VOCATIONAL,
      shift: ShiftType.MORNING,
    },
  });

  const class101 = await prisma.classGroup.create({
    data: {
      code: '101',
      academicYearId: academicYear.id,
      gradeLevelId: grade10.id,
      fieldOfStudyId: electricMorning.id,
      capacity: 30,
    },
  });

  // 4) هنرجوی نمونه
  const studentPassword = await argon2.hash('Student1234!');
  const studentUser = await prisma.user.upsert({
    where: { username: 'student1' },
    update: {},
    create: {
      username: 'student1',
      password: studentPassword,
      role: UserRole.STUDENT,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      firstName: 'رضا',
      lastName: 'هنرجو',
      fatherName: 'محمد',
      nationalId: '9876543210',
      livingSituation: LivingSituation.BOTH_PARENTS,
      birthDate: new Date('2008-10-10'),
    },
  });

  await prisma.studentEnrollment.create({
    data: {
      studentId: student.id,
      academicYearId: academicYear.id,
      classGroupId: class101.id,
      isActive: true,
    },
  });

  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
