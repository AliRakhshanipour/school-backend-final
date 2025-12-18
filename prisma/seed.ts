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
const adminPass   = await argon2.hash("Admin@12345");
const teacherPass = await argon2.hash("Teacher@12345");
const studentPass = await argon2.hash("Student@12345");

  // -----------------------------
  // Academic Years + Terms
  // -----------------------------
  // 1404-1405 (current-ish) + 1405-1406 (next)
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

  // Terms for ay1404
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

  // Terms for ay1405
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
  const grade10 = await prisma.gradeLevel.create({
    data: { name: "10", order: 1 },
  });
  const grade11 = await prisma.gradeLevel.create({
    data: { name: "11", order: 2 },
  });
  const grade12 = await prisma.gradeLevel.create({
    data: { name: "12", order: 3 },
  });

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
  // Courses (give codes to keep unique + stable)
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

  // -----------------------------
  // Users
  // -----------------------------
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      password: adminPass,
      role: UserRole.ADMIN,
    },
  });

  const teacherUser1 = await prisma.user.create({
    data: {
      username: "t.alavi",
      password: teacherPass,
      role: UserRole.TEACHER,
    },
  });

  const teacherUser2 = await prisma.user.create({
    data: {
      username: "t.karimi",
      password: teacherPass,
      role: UserRole.TEACHER,
    },
  });

  const studentUser1 = await prisma.user.create({
    data: {
      username: "s.ahmadi",
      password: studentPass,
      role: UserRole.STUDENT,
    },
  });

  const studentUser2 = await prisma.user.create({
    data: {
      username: "s.moradi",
      password: studentPass,
      role: UserRole.STUDENT,
    },
  });

  const studentUser3 = await prisma.user.create({
    data: {
      username: "s.hosseini",
      password: studentPass,
      role: UserRole.STUDENT,
    },
  });

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

  // -----------------------------
  // Students
  // -----------------------------
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

  // -----------------------------
  // ClassGroups (ay1404)
  // -----------------------------
  const class101 = await prisma.classGroup.create({
    data: {
      academicYearId: ay1404.id,
      code: "101",
      gradeLevelId: grade10.id,
      fieldOfStudyId: elecMorning.id,
      capacity: 30,
    },
  });

  const class102 = await prisma.classGroup.create({
    data: {
      academicYearId: ay1404.id,
      code: "102",
      gradeLevelId: grade10.id,
      fieldOfStudyId: compAfternoon.id,
      capacity: 30,
    },
  });

  // Next academic year class (for nextClassGroup demo)
  const class201_nextYear_elec = await prisma.classGroup.create({
    data: {
      academicYearId: ay1405.id,
      code: "201",
      gradeLevelId: grade11.id,
      fieldOfStudyId: elecMorning.id,
      capacity: 28,
    },
  });

  // Link promotion path: ay1404/101 -> ay1405/201
  await prisma.classGroup.update({
    where: { id: class101.id },
    data: { nextClassGroupId: class201_nextYear_elec.id },
  });

  // -----------------------------
  // Student Enrollments (ay1404)
  // -----------------------------
  await prisma.studentEnrollment.createMany({
    data: [
      {
        studentId: student1.id,
        academicYearId: ay1404.id,
        classGroupId: class101.id,
        isActive: true,
      },
      {
        studentId: student2.id,
        academicYearId: ay1404.id,
        classGroupId: class101.id,
        isActive: true,
      },
      {
        studentId: student3.id,
        academicYearId: ay1404.id,
        classGroupId: class102.id,
        isActive: true,
      },
    ],
  });

  // -----------------------------
  // Parents (final registration parents)
  // -----------------------------
  await prisma.parent.createMany({
    data: [
      // student1
      {
        studentId: student1.id,
        relation: ParentRelationType.FATHER,
        firstName: "رضا",
        lastName: "احمدی",
        nationalId: "6666666666",
        mobilePhone: "09120000111",
        educationLevel: EducationLevel.BACHELOR,
        jobTitle: "کارمند",
        isAlive: true,
        homeAddress: "تهران",
      },
      {
        studentId: student1.id,
        relation: ParentRelationType.MOTHER,
        firstName: "مریم",
        lastName: "احمدی",
        nationalId: "7777777777",
        mobilePhone: "09120000112",
        educationLevel: EducationLevel.DIPLOMA,
        jobTitle: "خانه‌دار",
        isAlive: true,
        homeAddress: "تهران",
      },

      // student2
      {
        studentId: student2.id,
        relation: ParentRelationType.MOTHER,
        firstName: "لیلا",
        lastName: "مرادی",
        nationalId: "8888888888",
        mobilePhone: "09120000221",
        educationLevel: EducationLevel.MASTER,
        jobTitle: "معلم",
        isAlive: true,
        homeAddress: "تهران",
      },

      // student3
      {
        studentId: student3.id,
        relation: ParentRelationType.FATHER,
        firstName: "کاظم",
        lastName: "حسینی",
        nationalId: "9999999999",
        mobilePhone: "09120000331",
        educationLevel: EducationLevel.DIPLOMA,
        jobTitle: "آزاد",
        isAlive: true,
        homeAddress: "تهران",
      },
    ],
  });

  // -----------------------------
  // Course Assignments (ay1404)
  // -----------------------------
  // Class 101 (Electricity)
  const asg101_math = await prisma.courseAssignment.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseId: courseMath10.id,
      mainTeacherId: teacher1.id,
      weeklyHours: 2,
    },
  });

  const asg101_elecWorkshop = await prisma.courseAssignment.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseId: courseElecWorkshop10.id,
      mainTeacherId: teacher1.id,
      assistantTeacherId: teacher2.id,
      weeklyHours: 3,
    },
  });

  // Class 102 (Computer)
  const asg102_netWorkshop = await prisma.courseAssignment.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseId: courseCompWorkshop10.id,
      mainTeacherId: teacher2.id,
      weeklyHours: 3,
    },
  });

  const asg102_physics = await prisma.courseAssignment.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseId: coursePhysics10.id,
      mainTeacherId: teacher1.id,
      weeklyHours: 2,
    },
  });

  // -----------------------------
  // Weekly Schedule Slots
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

  // -----------------------------
  // Course Sessions (real held sessions)
  // -----------------------------
  const s101_math_1 = await prisma.courseSession.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_math.id,
      plannedScheduleSlotId: slot101_math_sat.id,
      date: d("2025-10-04T08:00:00.000Z"),
      topic: "اعداد حقیقی و بازه‌ها",
      isLocked: false,
    },
  });

  const s101_workshop_1 = await prisma.courseSession.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_elecWorkshop.id,
      plannedScheduleSlotId: slot101_workshop_sun.id,
      date: d("2025-10-05T10:00:00.000Z"),
      topic: "مدار سری و موازی (عملی)",
      isLocked: false,
    },
  });

  const s101_workshop_2 = await prisma.courseSession.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_elecWorkshop.id,
      plannedScheduleSlotId: slot101_workshop_sun.id,
      date: d("2025-10-12T10:00:00.000Z"),
      topic: "اندازه‌گیری با مولتی‌متر",
      isLocked: false,
    },
  });

  const s102_workshop_1 = await prisma.courseSession.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class102.id,
      courseAssignmentId: asg102_netWorkshop.id,
      plannedScheduleSlotId: slot102_workshop_mon.id,
      date: d("2025-10-06T13:00:00.000Z"),
      topic: "آشنایی با کابل‌کشی شبکه",
      isLocked: false,
    },
  });

  // -----------------------------
  // Attendance (unique per session+student)
  // -----------------------------
  // class101 students: student1, student2
  await prisma.studentAttendance.createMany({
    data: [
      // s101_math_1
      {
        sessionId: s101_math_1.id,
        studentId: student1.id,
        status: AttendanceStatus.PRESENT,
        isLate: false,
        lateMinutes: 0,
        markedByTeacherId: teacher1.id,
      },
      {
        sessionId: s101_math_1.id,
        studentId: student2.id,
        status: AttendanceStatus.ABSENT,
        isLate: false,
        lateMinutes: 0,
        note: "بدون اطلاع",
        markedByTeacherId: teacher1.id,
      },

      // s101_workshop_1
      {
        sessionId: s101_workshop_1.id,
        studentId: student1.id,
        status: AttendanceStatus.PRESENT,
        isLate: true,
        lateMinutes: 8,
        note: "ترافیک",
        markedByTeacherId: teacher1.id,
      },
      {
        sessionId: s101_workshop_1.id,
        studentId: student2.id,
        status: AttendanceStatus.EXCUSED,
        isLate: false,
        lateMinutes: 0,
        note: "گواهی پزشکی",
        markedByTeacherId: teacher1.id,
      },

      // s101_workshop_2
      {
        sessionId: s101_workshop_2.id,
        studentId: student1.id,
        status: AttendanceStatus.PRESENT,
        isLate: false,
        lateMinutes: 0,
        markedByTeacherId: teacher1.id,
      },
      {
        sessionId: s101_workshop_2.id,
        studentId: student2.id,
        status: AttendanceStatus.PRESENT,
        isLate: false,
        lateMinutes: 0,
        markedByTeacherId: teacher1.id,
      },
    ],
  });

  // class102 student: student3
  await prisma.studentAttendance.create({
    data: {
      sessionId: s102_workshop_1.id,
      studentId: student3.id,
      status: AttendanceStatus.PRESENT,
      isLate: false,
      lateMinutes: 0,
      markedByTeacherId: teacher2.id,
    },
  });

  // -----------------------------
  // Workshop Scores (unique per session+student)
  // -----------------------------
  await prisma.workshopScore.createMany({
    data: [
      // s101_workshop_1
      {
        sessionId: s101_workshop_1.id,
        studentId: student1.id,
        reportScore: 26,
        disciplineScore: 9,
        workPrecisionScore: 9,
        circuitCorrectnessScore: 22,
        questionsScore: 23,
        totalScore: 89,
      },
      {
        sessionId: s101_workshop_1.id,
        studentId: student2.id,
        reportScore: 24,
        disciplineScore: 10,
        workPrecisionScore: 8,
        circuitCorrectnessScore: 21,
        questionsScore: 20,
        totalScore: 83,
      },

      // s101_workshop_2
      {
        sessionId: s101_workshop_2.id,
        studentId: student1.id,
        reportScore: 28,
        disciplineScore: 10,
        workPrecisionScore: 9,
        circuitCorrectnessScore: 23,
        questionsScore: 24,
        totalScore: 94,
      },
      {
        sessionId: s101_workshop_2.id,
        studentId: student2.id,
        reportScore: 25,
        disciplineScore: 9,
        workPrecisionScore: 8,
        circuitCorrectnessScore: 22,
        questionsScore: 22,
        totalScore: 86,
      },

      // s102_workshop_1
      {
        sessionId: s102_workshop_1.id,
        studentId: student3.id,
        reportScore: 27,
        disciplineScore: 9,
        workPrecisionScore: 9,
        circuitCorrectnessScore: 20,
        questionsScore: 22,
        totalScore: 87,
      },
    ],
  });

  // -----------------------------
  // Theory Exam + Results
  // -----------------------------
  const examMathMidterm101 = await prisma.theoryExam.create({
    data: {
      academicYearId: ay1404.id,
      classGroupId: class101.id,
      courseAssignmentId: asg101_math.id,
      term: ExamTerm.FIRST,
      method: ExamMethod.WRITTEN,
      category: ExamCategory.MIDTERM,
      title: "میان‌ترم ریاضی ۱",
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
    data: [
      {
        theoryExamId: examMathMidterm101.id,
        studentId: student1.id,
        score: new Prisma.Decimal("18.5"),
        note: "عالی",
      },
      {
        theoryExamId: examMathMidterm101.id,
        studentId: student2.id,
        score: new Prisma.Decimal("14.0"),
        note: "نیاز به تمرین بیشتر",
      },
    ],
  });

  // -----------------------------
  // PreRegistration Window (ay1405 as upcoming admissions)
  // -----------------------------
  await prisma.preRegistrationWindow.create({
    data: {
      academicYearId: ay1405.id,
      startAt: d("2026-06-01T00:00:00.000Z"),
      endAt: d("2026-09-10T23:59:59.000Z"),
      isActive: true,
    },
  });

  // -----------------------------
  // PreRegistrations + Parents (ay1405)
  // -----------------------------
  const preReg1 = await prisma.preRegistration.create({
    data: {
      academicYearId: ay1405.id,
      status: PreRegistrationStatus.PENDING,
      requestedFieldOfStudyId: elecMorning.id,
      // snapshot fields
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
        mobilePhone: "09120000991",
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
        mobilePhone: "09120000992",
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
      assignedClassGroupId: class201_nextYear_elec.id, // just to demo assignment linkage
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
  // Teacher Leave Requests
  // -----------------------------
  await prisma.teacherLeaveRequest.create({
    data: {
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
  });

  await prisma.teacherLeaveRequest.create({
    data: {
      teacherId: teacher2.id,
      academicYearId: ay1404.id,
      type: LeaveType.PERSONAL,
      startDate: d("2025-12-10T08:00:00.000Z"),
      endDate: d("2025-12-10T12:00:00.000Z"),
      isFullDay: false,
      reason: "کار شخصی",
      status: LeaveStatus.PENDING,
    },
  });

  // -----------------------------
  // News Posts
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
    ],
  });

  // -----------------------------
  // Public Page Sections
  // -----------------------------
  await prisma.publicPageSection.createMany({
    data: [
      {
        sectionKey: "hero",
        title: "هنرستان نمونه",
        content: "به هنرستان نمونه خوش آمدید.",
        displayOrder: 0,
        isActive: true,
      },
      {
        sectionKey: "about",
        title: "درباره ما",
        content: "آموزش مهارت‌محور در رشته‌های فنی و حرفه‌ای.",
        displayOrder: 1,
        isActive: true,
      },
      {
        sectionKey: "contact",
        title: "تماس با ما",
        content: "تلفن: 021-00000000",
        displayOrder: 2,
        isActive: true,
      },
    ],
  });

  console.log("✅ Seed completed.");

  console.log("\n--- Test Accounts ---");
  console.log("ADMIN   username=admin       password=Admin@12345");
  console.log("TEACHER username=t.alavi     password=Teacher@12345");
  console.log("TEACHER username=t.karimi    password=Teacher@12345");
  console.log("STUDENT username=s.ahmadi    password=Student@12345");
  console.log("STUDENT username=s.moradi    password=Student@12345");
  console.log("STUDENT username=s.hosseini  password=Student@12345");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
