// src/modules/reports/reports.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  CourseType,
  AttendanceStatus,
  ExamTerm,
} from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Helpers مشترک ----------

  private async getStudentAndYearOrThrow(
    studentId: string,
    academicYearId: number,
  ) {
    const [student, academicYear] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: studentId },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
      }),
    ]);

    if (!student) {
      throw new NotFoundException('هنرجو پیدا نشد');
    }

    if (!academicYear) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }

    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        academicYearId,
      },
      include: {
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new BadRequestException(
        'این هنرجو در این سال تحصیلی در هیچ کلاسی ثبت‌نام نشده است',
      );
    }

    return {
      student,
      academicYear,
      enrollment,
      classGroup: enrollment.classGroup,
    };
  }

  private async getAssignmentsForClassYear(
    academicYearId: number,
    classGroupId: number,
  ) {
    const assignments = await this.prisma.courseAssignment.findMany({
      where: {
        academicYearId,
        classGroupId,
      },
      include: {
        course: true,
        mainTeacher: {
          include: {
            user: true,
          },
        },
      },
    });

    return assignments;
  }

  private aggregateAttendance(records: any[]) {
    let total = 0;
    let present = 0;
    let absent = 0;
    let excused = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;

    for (const r of records) {
      total++;
      switch (r.status as AttendanceStatus) {
        case AttendanceStatus.PRESENT:
          present++;
          break;
        case AttendanceStatus.ABSENT:
          absent++;
          break;
        case AttendanceStatus.EXCUSED:
          excused++;
          break;
      }
      if (r.isLate) {
        lateCount++;
        totalLateMinutes += r.lateMinutes ?? 0;
      }
    }

    const absenceRate =
      total > 0 ? Number((absent / total).toFixed(3)) : 0;

    return {
      totalSessions: total,
      present,
      absent,
      excused,
      lateCount,
      totalLateMinutes,
      absenceRate,
    };
  }

  private aggregateWorkshopScores(scores: any[]) {
    if (scores.length === 0) {
      return {
        sessionCount: 0,
        averageOutOf100: null,
        finalScoreOutOf20: null,
      };
    }

    const sum = scores.reduce(
      (acc, s) => acc + Number(s.totalScore),
      0,
    );
    const count = scores.length;
    const avg100 = sum / count;
    const final20 = (avg100 / 100) * 20;

    return {
      sessionCount: count,
      averageOutOf100: Number(avg100.toFixed(2)),
      finalScoreOutOf20: Number(final20.toFixed(2)),
    };
  }

  private aggregateTheoryExamsForStudent(
    examsWithResults: {
      theoryExam: {
        id: number;
        term: ExamTerm;
        method: string;
        category: string;
        maxScore: number;
        weight: number;
        startAt: Date;
        title: string | null;
      };
      score: any;
      note: string | null;
    }[],
  ) {
    const perTerm: Record<
      ExamTerm,
      {
        totalWeightedNormalized: number;
        totalWeight: number;
      }
    > = {
      FIRST: { totalWeightedNormalized: 0, totalWeight: 0 },
      SECOND: { totalWeightedNormalized: 0, totalWeight: 0 },
      SUMMER: { totalWeightedNormalized: 0, totalWeight: 0 },
    };

    const exams = examsWithResults.map((r) => {
      const exam = r.theoryExam;
      const score = Number(r.score);

      const normalized = exam.maxScore > 0 ? score / exam.maxScore : 0;
      const weightedNormalized = normalized * exam.weight;

      perTerm[exam.term].totalWeightedNormalized += weightedNormalized;
      perTerm[exam.term].totalWeight += exam.weight;

      return {
        examId: exam.id,
        term: exam.term,
        method: exam.method,
        category: exam.category,
        title: exam.title,
        date: exam.startAt,
        maxScore: exam.maxScore,
        weight: exam.weight,
        score,
        normalizedScore: Number(normalized.toFixed(3)),
      };
    });

    const termFinals: Record<
      ExamTerm,
      {
        finalScoreOutOf20: number | null;
        totalWeight: number;
      }
    > = {
      FIRST: { finalScoreOutOf20: null, totalWeight: 0 },
      SECOND: { finalScoreOutOf20: null, totalWeight: 0 },
      SUMMER: { finalScoreOutOf20: null, totalWeight: 0 },
    };

    (['FIRST', 'SECOND', 'SUMMER'] as ExamTerm[]).forEach((term) => {
      const agg = perTerm[term];
      if (agg.totalWeight > 0) {
        const normalized =
          agg.totalWeightedNormalized / agg.totalWeight;
        const score20 = normalized * 20;
        termFinals[term] = {
          finalScoreOutOf20: Number(score20.toFixed(2)),
          totalWeight: agg.totalWeight,
        };
      }
    });

    const finals = [
      termFinals.FIRST.finalScoreOutOf20,
      termFinals.SECOND.finalScoreOutOf20,
    ].filter((v) => typeof v === 'number') as number[];

    const yearFinal =
      finals.length > 0
        ? Number(
            (
              finals.reduce((a, b) => a + b, 0) / finals.length
            ).toFixed(2),
          )
        : null;

    return {
      exams,
      termFinals,
      yearFinalOutOf20: yearFinal,
    };
  }

  // ---------- 1) گزارش سال تحصیلی هنرجو ----------

  async getStudentYearReport(
    studentId: string,
    academicYearId: number,
  ) {
    const { student, academicYear, classGroup } =
      await this.getStudentAndYearOrThrow(studentId, academicYearId);

    const assignments = await this.getAssignmentsForClassYear(
      academicYearId,
      classGroup.id,
    );

    if (assignments.length === 0) {
      return {
        student,
        academicYear,
        classGroup,
        courses: [],
        overall: {
          totalCourses: 0,
          overallAverageOutOf20: null,
          totalAbsences: 0,
          totalLateMinutes: 0,
        },
      };
    }

    const attendanceRecords =
      await this.prisma.studentAttendance.findMany({
        where: {
          studentId,
          session: {
            academicYearId,
            classGroupId: classGroup.id,
          },
        },
        include: {
          session: {
            select: {
              courseAssignmentId: true,
            },
          },
        },
      });

    const workshopScores = await this.prisma.workshopScore.findMany({
      where: {
        studentId,
        session: {
          academicYearId,
          courseAssignment: {
            classGroupId: classGroup.id,
          },
        },
      },
      include: {
        session: {
          select: { courseAssignmentId: true },
        },
      },
    });

    const examResults = await this.prisma.theoryExamResult.findMany({
      where: {
        studentId,
        theoryExam: {
          academicYearId,
          classGroupId: classGroup.id,
        },
      },
      include: {
        theoryExam: true,
      },
    });

    const coursesReport: any[] = [];
    const finalScores: number[] = [];
    let totalAbsences = 0;
    let totalLateMinutes = 0;

    for (const assignment of assignments) {
      const courseAttendance = attendanceRecords.filter(
        (r) => r.session.courseAssignmentId === assignment.id,
      );

      const attendanceAgg =
        this.aggregateAttendance(courseAttendance);

      totalAbsences += attendanceAgg.absent;
      totalLateMinutes += attendanceAgg.totalLateMinutes;

      const courseWorkshopScores = workshopScores.filter(
        (ws) => ws.session.courseAssignmentId === assignment.id,
      );

      const workshopAgg =
        assignment.course.type === CourseType.WORKSHOP
          ? this.aggregateWorkshopScores(courseWorkshopScores)
          : {
              sessionCount: 0,
              averageOutOf100: null,
              finalScoreOutOf20: null,
            };

      const courseExamResults = examResults.filter(
        (er) =>
          er.theoryExam.courseAssignmentId === assignment.id,
      );

      const theoryAgg =
        assignment.course.type === CourseType.THEORY
          ? this.aggregateTheoryExamsForStudent(
              courseExamResults.map((er) => ({
                theoryExam: {
                  id: er.theoryExam.id,
                  term: er.theoryExam.term,
                  method: er.theoryExam.method,
                  category: er.theoryExam.category,
                  maxScore: er.theoryExam.maxScore,
                  weight: er.theoryExam.weight,
                  startAt: er.theoryExam.startAt,
                  title: er.theoryExam.title,
                },
                score: er.score,
                note: er.note,
              })),
            )
          : {
              exams: [],
              termFinals: {
                FIRST: { finalScoreOutOf20: null, totalWeight: 0 },
                SECOND: {
                  finalScoreOutOf20: null,
                  totalWeight: 0,
                },
                SUMMER: {
                  finalScoreOutOf20: null,
                  totalWeight: 0,
                },
              },
              yearFinalOutOf20: null,
            };

      let finalCourseScore: number | null = null;

      if (assignment.course.type === CourseType.THEORY) {
        finalCourseScore = theoryAgg.yearFinalOutOf20;
      } else if (assignment.course.type === CourseType.WORKSHOP) {
        finalCourseScore = workshopAgg.finalScoreOutOf20;
      }

      if (typeof finalCourseScore === 'number') {
        finalScores.push(finalCourseScore);
      }

      coursesReport.push({
        courseAssignmentId: assignment.id,
        course: {
          id: assignment.course.id,
          name: assignment.course.name,
          type: assignment.course.type,
        },
        teacher: assignment.mainTeacher
          ? {
              id: assignment.mainTeacherId,
              username: assignment.mainTeacher.user.username,
            }
          : {
              id: assignment.mainTeacherId,
              username: null,
            },
        theory: theoryAgg,
        workshop: workshopAgg,
        attendance: attendanceAgg,
        finalCourseScoreOutOf20: finalCourseScore,
      });
    }

    const overallAverage =
      finalScores.length > 0
        ? Number(
            (
              finalScores.reduce((a, b) => a + b, 0) /
              finalScores.length
            ).toFixed(2),
          )
        : null;

    return {
      student,
      academicYear,
      classGroup,
      courses: coursesReport,
      overall: {
        totalCourses: assignments.length,
        overallAverageOutOf20: overallAverage,
        totalAbsences,
        totalLateMinutes,
      },
    };
  }

  // ---------- 2) گزارش سال تحصیلی کلاس ----------

  async getClassYearReport(
    classGroupId: number,
    academicYearId: number,
  ) {
    const [classGroup, academicYear] = await Promise.all([
      this.prisma.classGroup.findUnique({
        where: { id: classGroupId },
        include: {
          fieldOfStudy: true,
          gradeLevel: true,
        },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
      }),
    ]);

    if (!classGroup) {
      throw new NotFoundException('کلاس پیدا نشد');
    }
    if (!academicYear) {
      throw new NotFoundException('سال تحصیلی پیدا نشد');
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId,
        classGroupId,
      },
      include: {
        student: true,
      },
    });

    if (enrollments.length === 0) {
      return {
        academicYear,
        classGroup,
        students: [],
        courseStats: [],
        overall: {
          studentCount: 0,
          classAverageOutOf20: null,
        },
      };
    }

    const studentReports: any[] = [];
    for (const enr of enrollments) {
      const report = await this.getStudentYearReport(
        enr.studentId,
        academicYearId,
      );
      studentReports.push(report);
    }

    type CourseKey = number;
    const courseStatsMap = new Map<
      CourseKey,
      {
        course: { id: number; name: string; type: CourseType };
        teacher: { id: string | null; username: string | null };
        scores: number[];
      }
    >();

    for (const r of studentReports) {
      for (const courseRep of r.courses) {
        const key = courseRep.course.id as CourseKey;
        if (!courseStatsMap.has(key)) {
          courseStatsMap.set(key, {
            course: courseRep.course,
            teacher: courseRep.teacher,
            scores: [],
          });
        }
        if (
          typeof courseRep.finalCourseScoreOutOf20 === 'number'
        ) {
          courseStatsMap
            .get(key)
            ?.scores.push(courseRep.finalCourseScoreOutOf20);
        }
      }
    }

    const courseStats = Array.from(courseStatsMap.values()).map(
      (cs) => {
        if (cs.scores.length === 0) {
          return {
            course: cs.course,
            teacher: cs.teacher,
            averageOutOf20: null,
            minOutOf20: null,
            maxOutOf20: null,
          };
        }
        const avg =
          cs.scores.reduce((a, b) => a + b, 0) / cs.scores.length;
        const min = Math.min(...cs.scores);
        const max = Math.max(...cs.scores);

        return {
          course: cs.course,
          teacher: cs.teacher,
          averageOutOf20: Number(avg.toFixed(2)),
          minOutOf20: Number(min.toFixed(2)),
          maxOutOf20: Number(max.toFixed(2)),
        };
      },
    );

    const classAverages = studentReports
      .map((r) => r.overall.overallAverageOutOf20)
      .filter(
        (v: any): v is number =>
          typeof v === 'number' && !isNaN(v),
      );

    const classAverage =
      classAverages.length > 0
        ? Number(
            (
              classAverages.reduce((a, b) => a + b, 0) /
              classAverages.length
            ).toFixed(2),
          )
        : null;

    return {
      academicYear,
      classGroup,
      students: studentReports.map((r) => ({
        student: r.student,
        overall: r.overall,
        courses: r.courses,
      })),
      courseStats,
      overall: {
        studentCount: enrollments.length,
        classAverageOutOf20: classAverage,
      },
    };
  }

  // ---------- 3) گزارش درس برای معلم ----------

  async getTeacherCourseAssignmentReport(
    userId: string,
    courseAssignmentId: number,
  ) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });
    if (!teacher) {
      throw new ForbiddenException(
        'فقط معلم‌ها به این گزارش دسترسی دارند',
      );
    }

    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: courseAssignmentId },
      include: {
        course: true,
        academicYear: true,
        classGroup: {
          include: {
            fieldOfStudy: true,
            gradeLevel: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('انتساب درس-کلاس پیدا نشد');
    }

    if (assignment.mainTeacherId !== teacher.id) {
      throw new ForbiddenException(
        'فقط معلم اصلی این درس می‌تواند این گزارش را ببیند',
      );
    }

    const yearId = assignment.academicYearId;
    const classGroupId = assignment.classGroupId;

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: yearId,
        classGroupId,
      },
      include: {
        student: true,
      },
    });

    const attendanceRecords =
      await this.prisma.studentAttendance.findMany({
        where: {
          session: {
            academicYearId: yearId,
            courseAssignmentId: assignment.id,
          },
        },
        include: {
          student: true,
        },
      });

    const workshopScores = await this.prisma.workshopScore.findMany(
      {
        where: {
          session: {
            academicYearId: yearId,
            courseAssignmentId: assignment.id,
          },
        },
        include: {
          student: true,
        },
      },
    );

    const examResults = await this.prisma.theoryExamResult.findMany({
      where: {
        theoryExam: {
          academicYearId: yearId,
          classGroupId,
          courseAssignmentId: assignment.id,
        },
      },
      include: {
        theoryExam: true,
        student: true,
      },
    });

    const studentsReport: any[] = [];

    for (const enr of enrollments) {
      const student = enr.student;

      const studentAttendance = attendanceRecords.filter(
        (r) => r.studentId === student.id,
      );
      const attendanceAgg =
        this.aggregateAttendance(studentAttendance);

      const studentWorkshopScores = workshopScores.filter(
        (ws) => ws.studentId === student.id,
      );
      const workshopAgg =
        assignment.course.type === CourseType.WORKSHOP
          ? this.aggregateWorkshopScores(studentWorkshopScores)
          : {
              sessionCount: 0,
              averageOutOf100: null,
              finalScoreOutOf20: null,
            };

      const studentExamResults = examResults.filter(
        (er) => er.studentId === student.id,
      );

      const theoryAgg =
        assignment.course.type === CourseType.THEORY
          ? this.aggregateTheoryExamsForStudent(
              studentExamResults.map((er) => ({
                theoryExam: {
                  id: er.theoryExam.id,
                  term: er.theoryExam.term,
                  method: er.theoryExam.method,
                  category: er.theoryExam.category,
                  maxScore: er.theoryExam.maxScore,
                  weight: er.theoryExam.weight,
                  startAt: er.theoryExam.startAt,
                  title: er.theoryExam.title,
                },
                score: er.score,
                note: er.note,
              })),
            )
          : {
              exams: [],
              termFinals: {
                FIRST: { finalScoreOutOf20: null, totalWeight: 0 },
                SECOND: {
                  finalScoreOutOf20: null,
                  totalWeight: 0,
                },
                SUMMER: {
                  finalScoreOutOf20: null,
                  totalWeight: 0,
                },
              },
              yearFinalOutOf20: null,
            };

      let finalCourseScore: number | null = null;

      if (assignment.course.type === CourseType.THEORY) {
        finalCourseScore = theoryAgg.yearFinalOutOf20;
      } else if (assignment.course.type === CourseType.WORKSHOP) {
        finalCourseScore = workshopAgg.finalScoreOutOf20;
      }

      studentsReport.push({
        student,
        attendance: attendanceAgg,
        workshop: workshopAgg,
        theory: theoryAgg,
        finalCourseScoreOutOf20: finalCourseScore,
      });
    }

    const scores = studentsReport
      .map((s) => s.finalCourseScoreOutOf20)
      .filter(
        (v: any): v is number =>
          typeof v === 'number' && !Number.isNaN(v),
      );

    const averageScore =
      scores.length > 0
        ? Number(
            (
              scores.reduce((a: number, b: number) => a + b, 0) /
              scores.length
            ).toFixed(2),
          )
        : null;

    return {
      assignment: {
        id: assignment.id,
        course: assignment.course,
        academicYear: assignment.academicYear,
        classGroup: assignment.classGroup,
      },
      teacher,
      students: studentsReport,
      stats: {
        studentCount: enrollments.length,
        averageScoreOutOf20: averageScore,
      },
    };
  }

  // ---------- 4) کمک برای Student Reports Controller ----------

  async getStudentYearReportByUser(
    userId: string,
    academicYearId: number,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) {
      throw new ForbiddenException(
        'فقط هنرجوها به این گزارش دسترسی دارند',
      );
    }

    return this.getStudentYearReport(student.id, academicYearId);
  }
}
