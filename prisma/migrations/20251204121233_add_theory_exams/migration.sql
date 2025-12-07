-- CreateEnum
CREATE TYPE "ExamTerm" AS ENUM ('FIRST', 'SECOND', 'SUMMER');

-- CreateEnum
CREATE TYPE "ExamMethod" AS ENUM ('WRITTEN', 'ORAL', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "ExamCategory" AS ENUM ('QUIZ', 'MIDTERM', 'FINAL', 'OTHER');

-- CreateTable
CREATE TABLE "TheoryExam" (
    "id" SERIAL NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "classGroupId" INTEGER NOT NULL,
    "courseAssignmentId" INTEGER NOT NULL,
    "term" "ExamTerm" NOT NULL,
    "method" "ExamMethod" NOT NULL,
    "category" "ExamCategory" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 20,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdByTeacherId" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TheoryExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TheoryExamResult" (
    "id" SERIAL NOT NULL,
    "theoryExamId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DECIMAL(4,1) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TheoryExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TheoryExam_academicYearId_idx" ON "TheoryExam"("academicYearId");

-- CreateIndex
CREATE INDEX "TheoryExam_classGroupId_idx" ON "TheoryExam"("classGroupId");

-- CreateIndex
CREATE INDEX "TheoryExam_courseAssignmentId_idx" ON "TheoryExam"("courseAssignmentId");

-- CreateIndex
CREATE INDEX "TheoryExam_term_idx" ON "TheoryExam"("term");

-- CreateIndex
CREATE INDEX "TheoryExamResult_studentId_idx" ON "TheoryExamResult"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TheoryExamResult_theoryExamId_studentId_key" ON "TheoryExamResult"("theoryExamId", "studentId");

-- AddForeignKey
ALTER TABLE "TheoryExam" ADD CONSTRAINT "TheoryExam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryExam" ADD CONSTRAINT "TheoryExam_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryExam" ADD CONSTRAINT "TheoryExam_courseAssignmentId_fkey" FOREIGN KEY ("courseAssignmentId") REFERENCES "CourseAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryExam" ADD CONSTRAINT "TheoryExam_createdByTeacherId_fkey" FOREIGN KEY ("createdByTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryExamResult" ADD CONSTRAINT "TheoryExamResult_theoryExamId_fkey" FOREIGN KEY ("theoryExamId") REFERENCES "TheoryExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoryExamResult" ADD CONSTRAINT "TheoryExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
