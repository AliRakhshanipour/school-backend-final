-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SICK', 'PERSONAL', 'OFFICIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "NewsVisibility" AS ENUM ('PUBLIC', 'LOGGED_IN', 'STUDENTS', 'TEACHERS', 'ADMINS');

-- CreateTable
CREATE TABLE "TeacherLeaveRequest" (
    "id" SERIAL NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" INTEGER,
    "type" "LeaveType",
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isFullDay" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreRegistrationWindow" (
    "id" SERIAL NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreRegistrationWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "NewsVisibility" NOT NULL DEFAULT 'PUBLIC',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3),
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPageSection" (
    "id" SERIAL NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicPageSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherLeaveRequest_teacherId_idx" ON "TeacherLeaveRequest"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherLeaveRequest_academicYearId_idx" ON "TeacherLeaveRequest"("academicYearId");

-- CreateIndex
CREATE INDEX "TeacherLeaveRequest_status_idx" ON "TeacherLeaveRequest"("status");

-- CreateIndex
CREATE INDEX "PreRegistrationWindow_startAt_endAt_idx" ON "PreRegistrationWindow"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "PreRegistrationWindow_academicYearId_key" ON "PreRegistrationWindow"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_isPublished_visibility_publishAt_idx" ON "NewsPost"("isPublished", "visibility", "publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicPageSection_sectionKey_key" ON "PublicPageSection"("sectionKey");

-- AddForeignKey
ALTER TABLE "TeacherLeaveRequest" ADD CONSTRAINT "TeacherLeaveRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherLeaveRequest" ADD CONSTRAINT "TeacherLeaveRequest_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherLeaveRequest" ADD CONSTRAINT "TeacherLeaveRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistrationWindow" ADD CONSTRAINT "PreRegistrationWindow_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
