/* eslint-disable no-console */
// prisma/seed.ts

import {
  PrismaClient,
  Prisma,
  UserRole,
  EducationLevel,
  LivingSituation,
  ParentRelationType,
  SchoolType,
  ShiftType,
  CourseType,
  Weekday,
  AttendanceStatus,
  ExamTerm,
  ExamMethod,
  ExamCategory,
  LeaveStatus,
  LeaveType,
  PreRegistrationStatus,
  NewsVisibility,
  TermType,
} from "@prisma/client";

import * as argon2 from "argon2";

const prisma = new PrismaClient();

function d(iso: string) {
  // Always pass ISO with timezone (Z) to avoid local-time surprises.
  return new Date(iso);
}

// Date-only helper (still Date object in JS; Prisma handles DATE fields)
function day(isoDate: string) {
  // isoDate: "YYYY-MM-DD"
  return new Date(`${isoDate}T00:00:00.000Z`);
}

async function resetDatabase() {
  // Safety guard
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset database in production.");
  }

  // Break self-FK first (ClassGroup.nextClassGroupId)
  await prisma.classGroup.updateMany({
    data: { nextClassGroupId: null },
  });

  // Delete from leaves to roots to satisfy FK constraints
  await prisma.studentAttendance.deleteMany();
  // ✅ اضافه شده (اگر مدل موجود باشد)
  await prisma.teacherAttendance.deleteMany();

  await prisma.workshopScore.deleteMany();
  await prisma.theoryExamResult.deleteMany();
  await prisma.theoryExam.deleteMany();
  await prisma.courseSession.deleteMany();
  await prisma.weeklyScheduleSlot.deleteMany();
  await prisma.courseAssignment.deleteMany();

  await prisma.studentEnrollment.deleteMany();

  await prisma.parent.deleteMany();
  await prisma.preRegistrationParent.deleteMany();
  await prisma.preRegistration.deleteMany();

  await prisma.teacherLeaveRequest.deleteMany();
  await prisma.newsPost.deleteMany();
  await prisma.preRegistrationWindow.deleteMany();
  await prisma.publicPageSection.deleteMany();

  await prisma.classGroup.deleteMany();
  await prisma.term.deleteMany();
  await prisma.course.deleteMany();
  await prisma.gradeLevel.deleteMany();
  await prisma.fieldOfStudy.deleteMany();

  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  await prisma.academicYear.deleteMany();
}

async function main() {
  const RESET = process.env.SEED_RESET !== "false"; // default: true
  if (RESET) {
    console.log("🧨 Resetting database (set SEED_RESET=false to disable) ...");
    await resetDatabase();
  }

  console.log("🌱 Seeding...");

  // -----------------------------
  // Passwords
  // -----------------------------
  const adminPass = await argon2.hash("Admin@12345");
  const teacherPass = await argon2.hash("Teacher@12345");
  const studentPass = await argon2.hash("Student@12345");

  // -----------------------------
  // Academic Years + Terms
  // -----------------------------
  const ay1404 = await prisma.academicYear.create({
    data: {
      label: "1404-1405",
      startDate: d("2025-09-22T00:00:00.000Z"),
      endDate: d("2026-06-21T23:59:59.000Z"),
    },
  });

  const ay1405 = await prisma.academicYear.create({
    data: {
      label: "1405-1406",
      startDate: d("2026-09-22T00:00:00.000Z"),
      endDate: d("2027-06-21T23:59:59.000Z"),
    },
  });

  await prisma.term.createMany({
    data: [
      {
        academicYearId: ay1404.id,
        type: TermType.FIRST,
        startDate: d("2025-09-22T00:00:00.000Z"),
        endDate: d("2026-01-20T23:59:59.000Z"),
      },
      {
        academicYearId: ay1404.id,
        type: TermType.SECOND,
        startDate: d("2026-01-21T00:00:00.000Z"),
        endDate: d("2026-06-21T23:59:59.000Z"),
      },
    ],
  });

  await prisma.term.createMany({
    data: [
      {
        academicYearId: ay1405.id,
        type: TermType.FIRST,
        startDate: d("2026-09-22T00:00:00.000Z"),
        endDate: d("2027-01-20T23:59:59.000Z"),
      },
      {
        academicYearId: ay1405.id,
        type: TermType.SECOND,
        startDate: d("2027-01-21T00:00:00.000Z"),
        endDate: d("2027-06-21T23:59:59.000Z"),
      },
    ],
  });

  // -----------------------------
  // Grade Levels
  // -----------------------------
  const grade10 = await prisma.gradeLevel.create({ data: { name: "10", order: 1 } });
  const grade11 = await prisma.gradeLevel.create({ data: { name: "11", order: 2 } });
  const grade12 = await prisma.gradeLevel.create({ data: { name: "12", order: 3 } });

  // -----------------------------
  // Fields of Study
  // -----------------------------
  const elecMorning = await prisma.fieldOfStudy.create({
    data: {
      name: "برق صنعتی",
      schoolType: SchoolType.TECHNICAL_VOCATIONAL,
      shift: ShiftType.MORNING,
      isActive: true,
    },
  });

  const compAfternoon = await prisma.fieldOfStudy.create({
    data: {
      name: "شبکه و نرم‌افزار",
      schoolType: SchoolType.TECHNICAL_VOCATIONAL,
      shift: ShiftType.AFTERNOON,
      isActive: true,
    },
  });

  // -----------------------------
  // Courses
  // -----------------------------
  const courseMath10 = await prisma.course.create({
    data: {
      name: "ریاضی ۱",
      code: "MATH-10",
      type: CourseType.THEORY,
      gradeLevelId: grade10.id,
      isActive: true,
    },
  });

  const coursePhysics10 = await prisma.course.create({
    data: {
      name: "فیزیک ۱",
      code: "PHYS-10",
      type: CourseType.THEORY,
      gradeLevelId: grade10.id,
      isActive: true,
    },
  });

  const courseElecWorkshop10 = await prisma.course.create({
    data: {
      name: "کارگاه برق صنعتی ۱",
      code: "ELEC-W-10",
      type: CourseType.WORKSHOP,
      fieldOfStudyId: elecMorning.id,
      gradeLevelId: grade10.id,
      isActive: true,
    },
  });

  const courseCompWorkshop10 = await prisma.course.create({
    data: {
      name: "کارگاه شبکه ۱",
      code: "NET-W-10",
      type: CourseType.WORKSHOP,
      fieldOfStudyId: compAfternoon.id,
      gradeLevelId: grade10.id,
      isActive: true,
    },
  });

  // دیتای بیشتر (تئوری‌های عمومی)
  const coursePersian10 = await prisma.course.create({
    data: {
      name: "ادبیات فارسی ۱",
      code: "PERS-10",
      type: CourseType.THEORY,
      gradeLevelId: grade10.id,
      isActive: true,
    },
  });

  const courseEnglish10 = await prisma.course.create({
    data: {
      name: "زبان انگلیسی ۱",
      code: "ENG-10",
      type: CourseType.THEORY,
      gradeLevelId: grade10.id,
      isActive: true,
    },
  });

  const courseProgramming10 = await prisma.course.create({
    data: {
      name: "برنامه‌نویسی مقدماتی",
      code: "PRG-10",
      type: CourseType.THEORY,
      fieldOfStudyId: compAfternoon.id,
      gradeLevelId: grade10.id,
      isActive: true,
    },
  });

  // -----------------------------
  // Users (Admin / Teachers / Students)
  // -----------------------------
  const adminUser = await prisma.user.create({
    data: { username: "admin", password: adminPass, role: UserRole.ADMIN },
  });

  // Teachers users
  const teacherUser1 = await prisma.user.create({
    data: { username: "t.alavi", password: teacherPass, role: UserRole.TEACHER },
  });
  const teacherUser2 = await prisma.user.create({
    data: { username: "t.karimi", password: teacherPass, role: UserRole.TEACHER },
  });
  const teacherUser3 = await prisma.user.create({
    data: { username: "t.rahimi", password: teacherPass, role: UserRole.TEACHER },
  });
  const teacherUser4 = await prisma.user.create({
    data: { username: "t.mousavi", password: teacherPass, role: UserRole.TEACHER },
  });

  // Students users (بیشتر)
  const studentUsers = await Promise.all(
    [
      "s.ahmadi",
      "s.moradi",
      "s.hosseini",
      "s.soleimani",
      "s.rezaei",
      "s.jafari",
      "s.nouri",
      "s.fallah",
      "s.ghasemi",
      "s.gholami",
    ].map((u) =>
      prisma.user.create({
        data: { username: u, password: studentPass, role: UserRole.STUDENT },
      })
    )
  );

  // -----------------------------
  // Teachers
  // -----------------------------
  const teacher1 = await prisma.teacher.create({
    data: {
      userId: teacherUser1.id,
      firstName: "محمد",
      lastName: "علوی",
      fatherName: "حسین",
      personnelCode: "T-1001",
      nationalId: "1111111111",
      birthCertificateNumber: "BC-ALAVI-01",
      educationLevel: EducationLevel.MASTER,
      majorField: "برق صنعتی",
      workExperienceYears: 8,
      address: "تهران",
      phone: "09120000001",
      emergencyPhone: "02100000001",
      postalCode: "1111111111",
      photoPath: "/uploads/teachers/alavi.jpg",
      photoUpdatedAt: d("2025-10-01T10:00:00.000Z"),
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      userId: teacherUser2.id,
      firstName: "زهرا",
      lastName: "کریمی",
      fatherName: "علی",
      personnelCode: "T-1002",
      nationalId: "2222222222",
      birthCertificateNumber: "BC-KARIMI-01",
      educationLevel: EducationLevel.BACHELOR,
      majorField: "شبکه",
      workExperienceYears: 5,
      address: "تهران",
      phone: "09120000002",
      emergencyPhone: "02100000002",
      postalCode: "2222222222",
      photoPath: "/uploads/teachers/karimi.jpg",
      photoUpdatedAt: d("2025-10-01T10:05:00.000Z"),
    },
  });

  const teacher3 = await prisma.teacher.create({
    data: {
      userId: teacherUser3.id,
      firstName: "مهدی",
      lastName: "رحیمی",
      fatherName: "اکبر",
      personnelCode: "T-1003",
      nationalId: "2323232323",
      birthCertificateNumber: "BC-RAHIMI-01",
      educationLevel: EducationLevel.BACHELOR,
      majorField: "فیزیک",
      workExperienceYears: 6,
      address: "تهران",
      phone: "09120000003",
      emergencyPhone: "02100000003",
      postalCode: "3333333333",
      photoPath: "/uploads/teachers/rahimi.jpg",
      photoUpdatedAt: d("2025-10-01T10:10:00.000Z"),
    },
  });

  const teacher4 = await prisma.teacher.create({
    data: {
      userId: teacherUser4.id,
      firstName: "الهام",
      lastName: "موسوی",
      fatherName: "رضا",
      personnelCode: "T-1004",
      nationalId: "2424242424",
      birthCertificateNumber: "BC-MOUSAVI-01",
      educationLevel: EducationLevel.MASTER,
      majorField: "ادبیات",
      workExperienceYears: 7,
      address: "تهران",
      phone: "09120000004",
      emergencyPhone: "02100000004",
      postalCode: "4444444444",
      photoPath: "/uploads/teachers/mousavi.jpg",
      photoUpdatedAt: d("2025-10-01T10:15:00.000Z"),
    },
  });

  // -----------------------------
  // Students (بیشتر)
  // -----------------------------
  const [
    studentUser1,
    studentUser2,
    studentUser3,
    studentUser4,
    studentUser5,
    studentUser6,
    studentUser7,
    studentUser8,
    studentUser9,
    studentUser10,
  ] = studentUsers;

  const student1 = await prisma.student.create({
    data: {
      userId: studentUser1.id,
      firstName: "علی",
      lastName: "احمدی",
      nationalId: "3333333333",
      fatherName: "رضا",
      livingSituation: LivingSituation.BOTH_PARENTS,
      birthCertificateSeries: "د 12/321090",
      birthDate: d("2009-04-12T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("18.75"),
      lastYearMathScore: new Prisma.Decimal("19.50"),
      lastYearDisciplineScore: new Prisma.Decimal("20.00"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه نمونه دولتی شهید بهشتی",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02112345678",
      photoPath: "/uploads/students/ahmadi.jpg",
      photoUpdatedAt: d("2025-10-02T09:00:00.000Z"),
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: studentUser2.id,
      firstName: "سارا",
      lastName: "مرادی",
      nationalId: "4444444444",
      fatherName: "مجید",
      livingSituation: LivingSituation.MOTHER_ONLY,
      birthCertificateSeries: "ب 44/987650",
      birthDate: d("2009-09-30T00:00:00.000Z"),
      isLeftHanded: true,
      hasDisability: false,
      hasChronicDisease: true,
      chronicDiseaseDescription: "آسم خفیف",
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("17.90"),
      lastYearMathScore: new Prisma.Decimal("17.25"),
      lastYearDisciplineScore: new Prisma.Decimal("19.75"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه فرهنگ",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02187654321",
      photoPath: "/uploads/students/moradi.jpg",
      photoUpdatedAt: d("2025-10-02T09:10:00.000Z"),
    },
  });

  const student3 = await prisma.student.create({
    data: {
      userId: studentUser3.id,
      firstName: "رضا",
      lastName: "حسینی",
      nationalId: "5555555555",
      fatherName: "کاظم",
      livingSituation: LivingSituation.FATHER_ONLY,
      birthCertificateSeries: "ج 77/135790",
      birthDate: d("2009-01-18T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: true,
      specialMedicationDescription: "ویتامین D طبق نظر پزشک",
      lastYearAverage: new Prisma.Decimal("16.40"),
      lastYearMathScore: new Prisma.Decimal("15.75"),
      lastYearDisciplineScore: new Prisma.Decimal("18.50"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه پیام",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02122223333",
      photoPath: "/uploads/students/hosseini.jpg",
      photoUpdatedAt: d("2025-10-02T09:20:00.000Z"),
    },
  });

  const student4 = await prisma.student.create({
    data: {
      userId: studentUser4.id,
      firstName: "امیر",
      lastName: "سلیمانی",
      nationalId: "5656565656",
      fatherName: "حمید",
      livingSituation: LivingSituation.BOTH_PARENTS,
      birthCertificateSeries: "س 10/101010",
      birthDate: d("2009-06-20T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("17.20"),
      lastYearMathScore: new Prisma.Decimal("18.00"),
      lastYearDisciplineScore: new Prisma.Decimal("19.00"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه تلاش",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02140000001",
      photoPath: "/uploads/students/soleimani.jpg",
      photoUpdatedAt: d("2025-10-02T09:30:00.000Z"),
    },
  });

  const student5 = await prisma.student.create({
    data: {
      userId: studentUser5.id,
      firstName: "نرگس",
      lastName: "رضایی",
      nationalId: "5757575757",
      fatherName: "حسن",
      livingSituation: LivingSituation.BOTH_PARENTS,
      birthCertificateSeries: "ر 11/111111",
      birthDate: d("2009-11-02T00:00:00.000Z"),
      isLeftHanded: true,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("18.10"),
      lastYearMathScore: new Prisma.Decimal("18.75"),
      lastYearDisciplineScore: new Prisma.Decimal("19.50"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه امید",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02140000002",
      photoPath: "/uploads/students/rezaei.jpg",
      photoUpdatedAt: d("2025-10-02T09:40:00.000Z"),
    },
  });

  const student6 = await prisma.student.create({
    data: {
      userId: studentUser6.id,
      firstName: "حسام",
      lastName: "جعفری",
      nationalId: "5858585858",
      fatherName: "محمود",
      livingSituation: LivingSituation.GUARDIAN_RELATIVE,
      birthCertificateSeries: "ج 12/121212",
      birthDate: d("2009-08-18T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("16.90"),
      lastYearMathScore: new Prisma.Decimal("16.25"),
      lastYearDisciplineScore: new Prisma.Decimal("18.25"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه پیام",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02140000003",
      photoPath: "/uploads/students/jafari.jpg",
      photoUpdatedAt: d("2025-10-02T09:50:00.000Z"),
    },
  });

  const student7 = await prisma.student.create({
    data: {
      userId: studentUser7.id,
      firstName: "مهتاب",
      lastName: "نوری",
      nationalId: "5959595959",
      fatherName: "داود",
      livingSituation: LivingSituation.MOTHER_ONLY,
      birthCertificateSeries: "ن 13/131313",
      birthDate: d("2009-03-05T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("17.60"),
      lastYearMathScore: new Prisma.Decimal("17.00"),
      lastYearDisciplineScore: new Prisma.Decimal("19.25"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه فرهنگ",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02140000004",
      photoPath: "/uploads/students/nouri.jpg",
      photoUpdatedAt: d("2025-10-02T10:00:00.000Z"),
    },
  });

  const student8 = await prisma.student.create({
    data: {
      userId: studentUser8.id,
      firstName: "پارسا",
      lastName: "فلاح",
      nationalId: "6060606060",
      fatherName: "مجتبی",
      livingSituation: LivingSituation.BOTH_PARENTS,
      birthCertificateSeries: "ف 14/141414",
      birthDate: d("2009-12-12T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("15.80"),
      lastYearMathScore: new Prisma.Decimal("15.50"),
      lastYearDisciplineScore: new Prisma.Decimal("18.00"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه تلاش",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02140000005",
      photoPath: "/uploads/students/fallah.jpg",
      photoUpdatedAt: d("2025-10-02T10:10:00.000Z"),
    },
  });

  const student9 = await prisma.student.create({
    data: {
      userId: studentUser9.id,
      firstName: "یاسمن",
      lastName: "قاسمی",
      nationalId: "6161616161",
      fatherName: "ایرج",
      livingSituation: LivingSituation.FATHER_ONLY,
      birthCertificateSeries: "ق 15/151515",
      birthDate: d("2009-05-15T00:00:00.000Z"),
      isLeftHanded: true,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("17.10"),
      lastYearMathScore: new Prisma.Decimal("16.75"),
      lastYearDisciplineScore: new Prisma.Decimal("19.10"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه امید",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02140000006",
      photoPath: "/uploads/students/ghasemi.jpg",
      photoUpdatedAt: d("2025-10-02T10:20:00.000Z"),
    },
  });

  const student10 = await prisma.student.create({
    data: {
      userId: studentUser10.id,
      firstName: "کیان",
      lastName: "غلامی",
      nationalId: "6262626262",
      fatherName: "فرهاد",
      livingSituation: LivingSituation.BOTH_PARENTS,
      birthCertificateSeries: "غ 16/161616",
      birthDate: d("2009-02-02T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("18.40"),
      lastYearMathScore: new Prisma.Decimal("18.90"),
      lastYearDisciplineScore: new Prisma.Decimal("19.80"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه نمونه دولتی شهید بهشتی",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02140000007",
      photoPath: "/uploads/students/gholami.jpg",
      photoUpdatedAt: d("2025-10-02T10:30:00.000Z"),
    },
  });

  // -----------------------------
  // ClassGroups (ay1404)
  // -----------------------------
  const class101 = await prisma.classGroup.create({
    data: { academicYearId: ay1404.id, code: "101", gradeLevelId: grade10.id, fieldOfStudyId: elecMorning.id, capacity: 30 },
  });
  const class102 = await prisma.classGroup.create({
    data: { academicYearId: ay1404.id, code: "102", gradeLevelId: grade10.id, fieldOfStudyId: compAfternoon.id, capacity: 30 },
  });

  // دیتای بیشتر: دو کلاس اضافه
  const class103 = await prisma.classGroup.create({
    data: { academicYearId: ay1404.id, code: "103", gradeLevelId: grade10.id, fieldOfStudyId: elecMorning.id, capacity: 25 },
  });
  const class104 = await prisma.classGroup.create({
    data: { academicYearId: ay1404.id, code: "104", gradeLevelId: grade10.id, fieldOfStudyId: compAfternoon.id, capacity: 25 },
  });

  // Next-year classes (ay1405) for promotion demo
  const class201_elec = await prisma.classGroup.create({
    data: { academicYearId: ay1405.id, code: "201", gradeLevelId: grade11.id, fieldOfStudyId: elecMorning.id, capacity: 28 },
  });
  const class202_comp = await prisma.classGroup.create({
    data: { academicYearId: ay1405.id, code: "202", gradeLevelId: grade11.id, fieldOfStudyId: compAfternoon.id, capacity: 28 },
  });
  const class203_elec = await prisma.classGroup.create({
    data: { academicYearId: ay1405.id, code: "203", gradeLevelId: grade11.id, fieldOfStudyId: elecMorning.id, capacity: 26 },
  });
  const class204_comp = await prisma.classGroup.create({
    data: { academicYearId: ay1405.id, code: "204", gradeLevelId: grade11.id, fieldOfStudyId: compAfternoon.id, capacity: 26 },
  });

  // Link promotion paths
  await prisma.classGroup.update({ where: { id: class101.id }, data: { nextClassGroupId: class201_elec.id } });
  await prisma.classGroup.update({ where: { id: class102.id }, data: { nextClassGroupId: class202_comp.id } });
  await prisma.classGroup.update({ where: { id: class103.id }, data: { nextClassGroupId: class203_elec.id } });
  await prisma.classGroup.update({ where: { id: class104.id }, data: { nextClassGroupId: class204_comp.id } });

  // -----------------------------
  // Student Enrollments (ay1404)
  // -----------------------------
  const class101Students = [student1, student2, student4, student5];
  const class102Students = [student3, student6, student7];
  const class103Students = [student8, student9];
  const class104Students = [student10];

  await prisma.studentEnrollment.createMany({
    data: [
      ...class101Students.map((s) => ({ studentId: s.id, academicYearId: ay1404.id, classGroupId: class101.id, isActive: true })),
      ...class102Students.map((s) => ({ studentId: s.id, academicYearId: ay1404.id, classGroupId: class102.id, isActive: true })),
      ...class103Students.map((s) => ({ studentId: s.id, academicYearId: ay1404.id, classGroupId: class103.id, isActive: true })),
      ...class104Students.map((s) => ({ studentId: s.id, academicYearId: ay1404.id, classGroupId: class104.id, isActive: true })),
    ],
  });

  // -----------------------------
  // Parents (final registration parents) - بیشتر
  // -----------------------------
  await prisma.parent.createMany({
    data: [
      // student1
      { studentId: student1.id, relation: ParentRelationType.FATHER, firstName: "رضا", lastName: "احمدی", nationalId: "6666666666", mobilePhone: "09120000111", educationLevel: EducationLevel.BACHELOR, jobTitle: "کارمند", isAlive: true, homeAddress: "تهران" },
      { studentId: student1.id, relation: ParentRelationType.MOTHER, firstName: "مریم", lastName: "احمدی", nationalId: "7777777777", mobilePhone: "09120000112", educationLevel: EducationLevel.DIPLOMA, jobTitle: "خانه‌دار", isAlive: true, homeAddress: "تهران" },

      // student2
      { studentId: student2.id, relation: ParentRelationType.MOTHER, firstName: "لیلا", lastName: "مرادی", nationalId: "8888888888", mobilePhone: "09120000221", educationLevel: EducationLevel.MASTER, jobTitle: "معلم", isAlive: true, homeAddress: "تهران" },

      // student3
      { studentId: student3.id, relation: ParentRelationType.FATHER, firstName: "کاظم", lastName: "حسینی", nationalId: "9999999999", mobilePhone: "09120000331", educationLevel: EducationLevel.DIPLOMA, jobTitle: "آزاد", isAlive: true, homeAddress: "تهران" },

      // student4
      { studentId: student4.id, relation: ParentRelationType.FATHER, firstName: "حمید", lastName: "سلیمانی", nationalId: "7070707070", mobilePhone: "09120000441", educationLevel: EducationLevel.DIPLOMA, jobTitle: "آزاد", isAlive: true, homeAddress: "تهران" },

      // student5
      { studentId: student5.id, relation: ParentRelationType.MOTHER, firstName: "نسرین", lastName: "رضایی", nationalId: "7171717171", mobilePhone: "09120000551", educationLevel: EducationLevel.BACHELOR, jobTitle: "کارمند", isAlive: true, homeAddress: "تهران" },

      // student6
      { studentId: student6.id, relation: ParentRelationType.GUARDIAN_OTHER, firstName: "فاطمه", lastName: "جعفری", nationalId: "7272727272", mobilePhone: "09120000661", educationLevel: EducationLevel.DIPLOMA, jobTitle: "خانه‌دار", isAlive: true, homeAddress: "تهران" },

      // student7
      { studentId: student7.id, relation: ParentRelationType.MOTHER, firstName: "الهه", lastName: "نوری", nationalId: "7373737373", mobilePhone: "09120000771", educationLevel: EducationLevel.MASTER, jobTitle: "کارمند", isAlive: true, homeAddress: "تهران" },

      // student8
      { studentId: student8.id, relation: ParentRelationType.FATHER, firstName: "مجتبی", lastName: "فلاح", nationalId: "7474747474", mobilePhone: "09120000881", educationLevel: EducationLevel.DIPLOMA, jobTitle: "آزاد", isAlive: true, homeAddress: "تهران" },

      // student9
      { studentId: student9.id, relation: ParentRelationType.FATHER, firstName: "ایرج", lastName: "قاسمی", nationalId: "7575757575", mobilePhone: "09120000991", educationLevel: EducationLevel.BACHELOR, jobTitle: "کارمند", isAlive: true, homeAddress: "تهران" },

      // student10
      { studentId: student10.id, relation: ParentRelationType.FATHER, firstName: "فرهاد", lastName: "غلامی", nationalId: "7676767676", mobilePhone: "09120001010", educationLevel: EducationLevel.MASTER, jobTitle: "مهندس", isAlive: true, homeAddress: "تهران" },
    ],
  });

  // -----------------------------
  // Course Assignments (ay1404) - بیشتر
  // -----------------------------
  // Class 101 (Electricity)
  const asg101_math = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class101.id, courseId: courseMath10.id, mainTeacherId: teacher1.id, weeklyHours: 2 },
  });
  const asg101_physics = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class101.id, courseId: coursePhysics10.id, mainTeacherId: teacher3.id, weeklyHours: 2 },
  });
  const asg101_elecWorkshop = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class101.id, courseId: courseElecWorkshop10.id, mainTeacherId: teacher1.id, assistantTeacherId: teacher2.id, weeklyHours: 3 },
  });
  const asg101_persian = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class101.id, courseId: coursePersian10.id, mainTeacherId: teacher4.id, weeklyHours: 2 },
  });

  // Class 102 (Computer)
  const asg102_netWorkshop = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class102.id, courseId: courseCompWorkshop10.id, mainTeacherId: teacher2.id, weeklyHours: 3 },
  });
  const asg102_physics = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class102.id, courseId: coursePhysics10.id, mainTeacherId: teacher3.id, weeklyHours: 2 },
  });
  const asg102_prog = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class102.id, courseId: courseProgramming10.id, mainTeacherId: teacher2.id, weeklyHours: 2 },
  });
  const asg102_math = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class102.id, courseId: courseMath10.id, mainTeacherId: teacher1.id, weeklyHours: 2 },
  });

  // Class 103 (Electricity)
  const asg103_math = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class103.id, courseId: courseMath10.id, mainTeacherId: teacher1.id, weeklyHours: 2 },
  });
  const asg103_elecWorkshop = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class103.id, courseId: courseElecWorkshop10.id, mainTeacherId: teacher1.id, assistantTeacherId: teacher3.id, weeklyHours: 3 },
  });
  const asg103_english = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class103.id, courseId: courseEnglish10.id, mainTeacherId: teacher4.id, weeklyHours: 2 },
  });

  // Class 104 (Computer)
  const asg104_prog = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class104.id, courseId: courseProgramming10.id, mainTeacherId: teacher2.id, weeklyHours: 2 },
  });
  const asg104_math = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class104.id, courseId: courseMath10.id, mainTeacherId: teacher1.id, weeklyHours: 2 },
  });
  const asg104_netWorkshop = await prisma.courseAssignment.create({
    data: { academicYearId: ay1404.id, classGroupId: class104.id, courseId: courseCompWorkshop10.id, mainTeacherId: teacher2.id, weeklyHours: 3 },
  });

  // -----------------------------
  // Weekly Schedule Slots - بیشتر
  // -----------------------------
  const slot101_math_sat = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_math.id,
      weekday: Weekday.SATURDAY,
      startMinuteOfDay: 480, // 08:00
      endMinuteOfDay: 570, // 09:30
      roomLabel: "کلاس 101",
    },
  });

  const slot101_workshop_sun = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_elecWorkshop.id,
      weekday: Weekday.SUNDAY,
      startMinuteOfDay: 600, // 10:00
      endMinuteOfDay: 750, // 12:30
      roomLabel: "کارگاه برق 1",
    },
  });

  const slot101_physics_tue = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_physics.id,
      weekday: Weekday.TUESDAY,
      startMinuteOfDay: 480, // 08:00
      endMinuteOfDay: 570, // 09:30
      roomLabel: "کلاس 101",
    },
  });

  const slot101_persian_wed = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_persian.id,
      weekday: Weekday.WEDNESDAY,
      startMinuteOfDay: 480, // 08:00
      endMinuteOfDay: 570, // 09:30
      roomLabel: "کلاس 101",
    },
  });

  const slot102_math_sat = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseAssignmentId: asg102_math.id,
      weekday: Weekday.SATURDAY,
      startMinuteOfDay: 600, // 10:00
      endMinuteOfDay: 690, // 11:30
      roomLabel: "کلاس 102",
    },
  });

  const slot102_prog_sun = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseAssignmentId: asg102_prog.id,
      weekday: Weekday.SUNDAY,
      startMinuteOfDay: 480, // 08:00
      endMinuteOfDay: 570, // 09:30
      roomLabel: "کلاس 102",
    },
  });

  const slot102_workshop_mon = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseAssignmentId: asg102_netWorkshop.id,
      weekday: Weekday.MONDAY,
      startMinuteOfDay: 780, // 13:00
      endMinuteOfDay: 930, // 15:30
      roomLabel: "لابراتوار شبکه",
    },
  });

  const slot102_physics_tue = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseAssignmentId: asg102_physics.id,
      weekday: Weekday.TUESDAY,
      startMinuteOfDay: 600, // 10:00
      endMinuteOfDay: 690, // 11:30
      roomLabel: "کلاس 102",
    },
  });

  const slot103_math_sat = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class103.id,
      courseAssignmentId: asg103_math.id,
      weekday: Weekday.SATURDAY,
      startMinuteOfDay: 780, // 13:00
      endMinuteOfDay: 870, // 14:30
      roomLabel: "کلاس 103",
    },
  });

  const slot103_workshop_thu = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class103.id,
      courseAssignmentId: asg103_elecWorkshop.id,
      weekday: Weekday.THURSDAY,
      startMinuteOfDay: 600, // 10:00
      endMinuteOfDay: 750, // 12:30
      roomLabel: "کارگاه برق 2",
    },
  });

  const slot104_prog_wed = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class104.id,
      courseAssignmentId: asg104_prog.id,
      weekday: Weekday.WEDNESDAY,
      startMinuteOfDay: 780, // 13:00
      endMinuteOfDay: 870, // 14:30
      roomLabel: "کلاس 104",
    },
  });

  const slot104_workshop_thu = await prisma.weeklyScheduleSlot.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class104.id,
      courseAssignmentId: asg104_netWorkshop.id,
      weekday: Weekday.THURSDAY,
      startMinuteOfDay: 780, // 13:00
      endMinuteOfDay: 930, // 15:30
      roomLabel: "لابراتوار شبکه 2",
    },
  });

  // -----------------------------
  // Helpers for sessions + attendance
  // -----------------------------
  function pickStatus(idx: number): AttendanceStatus {
    // الگوی ساده برای تنوع
    if (idx % 9 === 0) return AttendanceStatus.ABSENT;
    if (idx % 7 === 0) return AttendanceStatus.EXCUSED;
    return AttendanceStatus.PRESENT;
  }

  function lateFor(idx: number) {
    if (idx % 6 === 0) return { isLate: true, lateMinutes: 5 + (idx % 10) };
    return { isLate: false, lateMinutes: 0 };
  }

  async function createSessionWithAttendance(params: {
    academicYearId: number;
    classGroupId: number;
    courseAssignmentId: number;
    plannedScheduleSlotId?: number | null;
    dateISO: string;
    topic: string;
    isLocked?: boolean;
    students: { id: string }[];
    markedByUserId: string; // ✅ REQUIRED
    markedByTeacherId: string | null;
  }) {
    const s = await prisma.courseSession.create({
      data: {
        academicYearId: params.academicYearId,
        classGroupId: params.classGroupId,
        courseAssignmentId: params.courseAssignmentId,
        plannedScheduleSlotId: params.plannedScheduleSlotId ?? null,
        date: d(params.dateISO),
        topic: params.topic,
        isLocked: params.isLocked ?? false,
      },
    });

    await prisma.studentAttendance.createMany({
      data: params.students.map((st, i) => {
        const status = pickStatus(i + s.id);
        const { isLate, lateMinutes } = lateFor(i + s.id);
        return {
          sessionId: s.id,
          studentId: st.id,
          status,
          isLate,
          lateMinutes,
          note: status === AttendanceStatus.ABSENT ? "غیبت" : null,
          markedByUserId: params.markedByUserId, // ✅ مهم
          markedByTeacherId: params.markedByTeacherId,
        };
      }),
      skipDuplicates: true,
    });

    return s;
  }

  async function createWorkshopScoresForSession(sessionId: number, students: { id: string }[]) {
    const rows = students.map((st, idx) => {
      const reportScore = 20 + (idx % 10);
      const disciplineScore = 8 + (idx % 3);
      const workPrecisionScore = 8 + (idx % 3);
      const circuitCorrectnessScore = 18 + (idx % 8);
      const questionsScore = 18 + (idx % 8);
      const totalScore = reportScore + disciplineScore + workPrecisionScore + circuitCorrectnessScore + questionsScore;

      return {
        sessionId,
        studentId: st.id,
        reportScore,
        disciplineScore,
        workPrecisionScore,
        circuitCorrectnessScore,
        questionsScore,
        totalScore,
      };
    });

    await prisma.workshopScore.createMany({ data: rows, skipDuplicates: true });
  }

  // -----------------------------
  // Course Sessions + Attendance + Scores (more)
  // -----------------------------
  // Class101 Math
  const s101_math_1 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class101.id,
    courseAssignmentId: asg101_math.id,
    plannedScheduleSlotId: slot101_math_sat.id,
    dateISO: "2025-10-04T08:00:00.000Z",
    topic: "اعداد حقیقی و بازه‌ها",
    students: class101Students,
    markedByUserId: teacher1.userId,  // ✅
    markedByTeacherId: teacher1.id,
  });

  const s101_math_2 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class101.id,
    courseAssignmentId: asg101_math.id,
    plannedScheduleSlotId: slot101_math_sat.id,
    dateISO: "2025-10-11T08:00:00.000Z",
    topic: "عبارت‌های جبری و ساده‌سازی",
    students: class101Students,
    markedByUserId: teacher1.userId,  // ✅
    markedByTeacherId: teacher1.id,
  });

  // Class101 Workshop
  const s101_workshop_1 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class101.id,
    courseAssignmentId: asg101_elecWorkshop.id,
    plannedScheduleSlotId: slot101_workshop_sun.id,
    dateISO: "2025-10-05T10:00:00.000Z",
    topic: "مدار سری و موازی (عملی)",
    students: class101Students,
    markedByUserId: teacher1.userId,  // ✅
    markedByTeacherId: teacher1.id,
  });
  await createWorkshopScoresForSession(s101_workshop_1.id, class101Students);

  const s101_workshop_2 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class101.id,
    courseAssignmentId: asg101_elecWorkshop.id,
    plannedScheduleSlotId: slot101_workshop_sun.id,
    dateISO: "2025-10-12T10:00:00.000Z",
    topic: "اندازه‌گیری با مولتی‌متر",
    students: class101Students,
    markedByUserId: teacher1.userId,  // ✅
    markedByTeacherId: teacher1.id,
  });
  await createWorkshopScoresForSession(s101_workshop_2.id, class101Students);

  // Class102 Workshop
  const s102_workshop_1 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class102.id,
    courseAssignmentId: asg102_netWorkshop.id,
    plannedScheduleSlotId: slot102_workshop_mon.id,
    dateISO: "2025-10-06T13:00:00.000Z",
    topic: "آشنایی با کابل‌کشی شبکه",
    students: class102Students,
    markedByUserId: teacher2.userId, // ✅
    markedByTeacherId: teacher2.id,
  });
  await createWorkshopScoresForSession(s102_workshop_1.id, class102Students);

  const s102_workshop_2 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class102.id,
    courseAssignmentId: asg102_netWorkshop.id,
    plannedScheduleSlotId: slot102_workshop_mon.id,
    dateISO: "2025-10-13T13:00:00.000Z",
    topic: "سوکت‌زنی RJ45 و تست",
    students: class102Students,
    markedByUserId: teacher2.userId, // ✅
    markedByTeacherId: teacher2.id,
  });
  await createWorkshopScoresForSession(s102_workshop_2.id, class102Students);

  // Class103 Workshop
  const s103_workshop_1 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class103.id,
    courseAssignmentId: asg103_elecWorkshop.id,
    plannedScheduleSlotId: slot103_workshop_thu.id,
    dateISO: "2025-10-09T10:00:00.000Z",
    topic: "آشنایی با ابزار کارگاه",
    students: class103Students,
    markedByUserId: teacher1.userId, // ✅
    markedByTeacherId: teacher1.id,
  });
  await createWorkshopScoresForSession(s103_workshop_1.id, class103Students);

  // Class104 Workshop
  const s104_workshop_1 = await createSessionWithAttendance({
    academicYearId: ay1404.id,
    classGroupId: class104.id,
    courseAssignmentId: asg104_netWorkshop.id,
    plannedScheduleSlotId: slot104_workshop_thu.id,
    dateISO: "2025-10-09T13:00:00.000Z",
    topic: "LAN basics (عملی)",
    students: class104Students,
    markedByUserId: teacher2.userId, // ✅
    markedByTeacherId: teacher2.id,
  });
  await createWorkshopScoresForSession(s104_workshop_1.id, class104Students);

  // -----------------------------
  // Theory Exams + Results (more)
  // -----------------------------
  const examMathMidterm101 = await prisma.theoryExam.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_math.id,
      term: ExamTerm.FIRST,
      method: ExamMethod.WRITTEN,
      category: ExamCategory.MIDTERM,
      title: "میان‌ترم ریاضی ۱ - کلاس 101",
      description: "فصل ۱ و ۲",
      startAt: d("2025-11-10T08:00:00.000Z"),
      endAt: d("2025-11-10T09:30:00.000Z"),
      maxScore: 20,
      weight: 0.4,
      createdByTeacherId: teacher1.id,
      isLocked: false,
    },
  });

  await prisma.theoryExamResult.createMany({
    data: class101Students.map((st, idx) => ({
      theoryExamId: examMathMidterm101.id,
      studentId: st.id,
      score: new Prisma.Decimal((14 + (idx % 7) + 0.5).toFixed(1)),
      note: idx % 2 === 0 ? "خوب" : "نیاز به تمرین",
    })),
    skipDuplicates: true,
  });

  const examNetworkQuiz102 = await prisma.theoryExam.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseAssignmentId: asg102_prog.id,
      term: ExamTerm.FIRST,
      method: ExamMethod.WRITTEN,
      category: ExamCategory.QUIZ,
      title: "کوییز برنامه‌نویسی - کلاس 102",
      description: "مبانی الگوریتم و متغیرها",
      startAt: d("2025-11-05T08:00:00.000Z"),
      endAt: d("2025-11-05T08:45:00.000Z"),
      maxScore: 20,
      weight: 0.2,
      createdByTeacherId: teacher2.id,
      isLocked: false,
    },
  });

  await prisma.theoryExamResult.createMany({
    data: class102Students.map((st, idx) => ({
      theoryExamId: examNetworkQuiz102.id,
      studentId: st.id,
      score: new Prisma.Decimal((12 + (idx % 8) + 0.25).toFixed(2)),
      note: "ثبت اولیه",
    })),
    skipDuplicates: true,
  });

  // -----------------------------
  // Teacher Attendance (Admin) - دیتا اضافه
  // -----------------------------
  await prisma.teacherAttendance.createMany({
    data: [
      {
        teacherId: teacher1.id,
        academicYearId: ay1404.id,
        date: day("2025-12-01"),
        status: AttendanceStatus.ABSENT,
        isLate: false,
        lateMinutes: 0,
        note: "مرخصی پزشکی",
        recordedByUserId: adminUser.id,
      },
      {
        teacherId: teacher2.id,
        academicYearId: ay1404.id,
        date: day("2025-12-10"),
        status: AttendanceStatus.PRESENT,
        isLate: true,
        lateMinutes: 12,
        note: "تاخیر به علت ترافیک",
        recordedByUserId: adminUser.id,
      },
      {
        teacherId: teacher3.id,
        academicYearId: ay1404.id,
        date: day("2025-12-03"),
        status: AttendanceStatus.PRESENT,
        isLate: false,
        lateMinutes: 0,
        note: null,
        recordedByUserId: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  // -----------------------------
  // Teacher Leave Requests (more)
  // -----------------------------
  await prisma.teacherLeaveRequest.createMany({
    data: [
      {
        teacherId: teacher1.id,
        academicYearId: ay1404.id,
        type: LeaveType.SICK,
        startDate: d("2025-12-01T00:00:00.000Z"),
        endDate: d("2025-12-02T23:59:59.000Z"),
        isFullDay: true,
        reason: "استراحت پزشکی",
        status: LeaveStatus.APPROVED,
        decidedByUserId: adminUser.id,
        decidedAt: d("2025-11-29T12:00:00.000Z"),
        decisionNote: "تایید شد",
      },
      {
        teacherId: teacher2.id,
        academicYearId: ay1404.id,
        type: LeaveType.PERSONAL,
        startDate: d("2025-12-10T08:00:00.000Z"),
        endDate: d("2025-12-10T12:00:00.000Z"),
        isFullDay: false,
        reason: "کار شخصی",
        status: LeaveStatus.PENDING,
      },
      {
        teacherId: teacher4.id,
        academicYearId: ay1404.id,
        type: LeaveType.PERSONAL,
        startDate: d("2025-12-15T00:00:00.000Z"),
        endDate: d("2025-12-15T23:59:59.000Z"),
        isFullDay: true,
        reason: "امور خانوادگی",
        status: LeaveStatus.APPROVED,
        decidedByUserId: adminUser.id,
        decidedAt: d("2025-12-12T10:00:00.000Z"),
        decisionNote: "تایید شد",
      },
    ],
  });

  // -----------------------------
  // PreRegistration Window + PreRegistrations (ay1405) - بیشتر
  // -----------------------------
  await prisma.preRegistrationWindow.create({
    data: {
      academicYearId: ay1405.id,
      startAt: d("2026-06-01T00:00:00.000Z"),
      endAt: d("2026-09-10T23:59:59.000Z"),
      isActive: true,
    },
  });

  const preReg1 = await prisma.preRegistration.create({
    data: {
      academicYearId: ay1405.id,
      status: PreRegistrationStatus.PENDING,
      requestedFieldOfStudyId: elecMorning.id,
      contactPhone: "09123334444",
      firstName: "مهدی",
      lastName: "صادقی",
      nationalId: "1212121212",
      fatherName: "حمید",
      livingSituation: LivingSituation.BOTH_PARENTS,
      birthCertificateSeries: "الف 01/010101",
      birthDate: d("2010-02-11T00:00:00.000Z"),
      isLeftHanded: false,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("17.25"),
      lastYearMathScore: new Prisma.Decimal("16.75"),
      lastYearDisciplineScore: new Prisma.Decimal("19.50"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه امید",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02199990000",
    },
  });

  await prisma.preRegistrationParent.createMany({
    data: [
      {
        preRegistrationId: preReg1.id,
        relation: ParentRelationType.FATHER,
        firstName: "حمید",
        lastName: "صادقی",
        nationalId: "1313131313",
        mobilePhone: "09120000992",
        educationLevel: EducationLevel.DIPLOMA,
        jobTitle: "راننده",
        isAlive: true,
        homeAddress: "تهران",
      },
      {
        preRegistrationId: preReg1.id,
        relation: ParentRelationType.MOTHER,
        firstName: "زهرا",
        lastName: "صادقی",
        nationalId: "1414141414",
        mobilePhone: "09120000993",
        educationLevel: EducationLevel.DIPLOMA,
        jobTitle: "خانه‌دار",
        isAlive: true,
        homeAddress: "تهران",
      },
    ],
  });

  const preReg2 = await prisma.preRegistration.create({
    data: {
      academicYearId: ay1405.id,
      status: PreRegistrationStatus.ACCEPTED,
      requestedFieldOfStudyId: compAfternoon.id,
      admittedFieldOfStudyId: compAfternoon.id,
      assignedClassGroupId: class202_comp.id,
      contactPhone: "09125556666",
      firstName: "نگار",
      lastName: "حاتمی",
      nationalId: "1515151515",
      fatherName: "سعید",
      livingSituation: LivingSituation.GUARDIAN_RELATIVE,
      birthCertificateSeries: "هـ 02/020202",
      birthDate: d("2010-07-01T00:00:00.000Z"),
      isLeftHanded: true,
      hasDisability: false,
      hasChronicDisease: false,
      hasSpecialMedication: false,
      lastYearAverage: new Prisma.Decimal("18.10"),
      lastYearMathScore: new Prisma.Decimal("18.00"),
      lastYearDisciplineScore: new Prisma.Decimal("20.00"),
      lastYearEducationLevel: "کلاس نهم",
      previousSchoolName: "مدرسه اندیشه",
      previousSchoolAddress: "تهران",
      previousSchoolPhone: "02188887777",
      photoPath: "/uploads/prereg/hatami.jpg",
      photoUpdatedAt: d("2026-07-10T10:00:00.000Z"),
    },
  });

  await prisma.preRegistrationParent.create({
    data: {
      preRegistrationId: preReg2.id,
      relation: ParentRelationType.GUARDIAN_OTHER,
      firstName: "الهام",
      lastName: "حاتمی",
      nationalId: "1616161616",
      mobilePhone: "09120000777",
      educationLevel: EducationLevel.BACHELOR,
      jobTitle: "کارمند",
      isAlive: true,
      homeAddress: "تهران",
      hasWarParticipation: false,
    },
  });

  // -----------------------------
  // News Posts (more)
  // -----------------------------
  await prisma.newsPost.createMany({
    data: [
      {
        title: "شروع سال تحصیلی",
        slug: "start-of-academic-year-1404",
        summary: "اطلاعیه شروع کلاس‌ها و برنامه کلی",
        content: "کلاس‌ها از هفته آینده طبق برنامه هفتگی برگزار می‌شود.",
        visibility: NewsVisibility.PUBLIC,
        isPublished: true,
        publishAt: d("2025-09-20T12:00:00.000Z"),
        authorUserId: adminUser.id,
      },
      {
        title: "اطلاعیه کارگاه‌ها",
        slug: "workshop-rules-1404",
        summary: "قوانین حضور در کارگاه",
        content: "لطفاً لباس کار و تجهیزات ایمنی را همراه داشته باشید.",
        visibility: NewsVisibility.STUDENTS,
        isPublished: true,
        publishAt: d("2025-10-01T08:00:00.000Z"),
        authorUserId: teacherUser1.id,
      },
      {
        title: "برگزاری آزمون میان‌ترم",
        slug: "midterm-exams-1404",
        summary: "زمان‌بندی آزمون‌ها اعلام شد",
        content: "برای مشاهده جزئیات، به بخش آموزش مراجعه کنید.",
        visibility: NewsVisibility.STUDENTS,
        isPublished: true,
        publishAt: d("2025-11-01T08:00:00.000Z"),
        authorUserId: adminUser.id,
      },
    ],
  });

  // -----------------------------
  // Public Page Sections
  // -----------------------------
  await prisma.publicPageSection.createMany({
    data: [
      { sectionKey: "hero", title: "هنرستان نمونه", content: "به هنرستان نمونه خوش آمدید.", displayOrder: 0, isActive: true },
      { sectionKey: "about", title: "درباره ما", content: "آموزش مهارت‌محور در رشته‌های فنی و حرفه‌ای.", displayOrder: 1, isActive: true },
      { sectionKey: "contact", title: "تماس با ما", content: "تلفن: 021-00000000", displayOrder: 2, isActive: true },
      { sectionKey: "rules", title: "قوانین", content: "حضور به‌موقع و رعایت نظم الزامی است.", displayOrder: 3, isActive: true },
    ],
  });

  console.log("✅ Seed completed.");

  console.log("\n--- Test Accounts ---");
  console.log("ADMIN   username=admin       password=Admin@12345");
  console.log("TEACHER username=t.alavi     password=Teacher@12345");
  console.log("TEACHER username=t.karimi    password=Teacher@12345");
  console.log("TEACHER username=t.rahimi    password=Teacher@12345");
  console.log("TEACHER username=t.mousavi   password=Teacher@12345");
  console.log("STUDENT username=s.ahmadi    password=Student@12345");
  console.log("STUDENT username=s.moradi    password=Student@12345");
  console.log("STUDENT username=s.hosseini  password=Student@12345");
  console.log("STUDENT username=s.soleimani password=Student@12345");
  console.log("STUDENT username=s.rezaei    password=Student@12345");
  console.log("STUDENT username=s.jafari    password=Student@12345");
  console.log("STUDENT username=s.nouri     password=Student@12345");
  console.log("STUDENT username=s.fallah    password=Student@12345");
  console.log("STUDENT username=s.ghasemi   password=Student@12345");
  console.log("STUDENT username=s.gholami   password=Student@12345");

  // hint
  console.log("\nTip: You can set SEED_RESET=false to keep data and only add new seed inserts.\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
