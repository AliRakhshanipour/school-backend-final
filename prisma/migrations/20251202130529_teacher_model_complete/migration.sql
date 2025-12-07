/*
  Warnings:

  - A unique constraint covering the columns `[name,schoolType,shift]` on the table `FieldOfStudy` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[personnelCode]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nationalId]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolType` to the `FieldOfStudy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shift` to the `FieldOfStudy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationalId` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personnelCode` to the `Teacher` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PreRegistrationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'RESERVED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('TECHNICAL_VOCATIONAL', 'KAR_O_DANESH');

-- DropIndex
DROP INDEX "FieldOfStudy_name_key";

-- AlterTable
ALTER TABLE "ClassGroup" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "FieldOfStudy" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "schoolType" "SchoolType" NOT NULL,
ADD COLUMN     "shift" "ShiftType" NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthCertificateNumber" TEXT,
ADD COLUMN     "educationLevel" "EducationLevel",
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "majorField" TEXT,
ADD COLUMN     "nationalId" TEXT NOT NULL,
ADD COLUMN     "personnelCode" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "photoUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "workExperienceYears" INTEGER;

-- CreateTable
CREATE TABLE "PreRegistration" (
    "id" TEXT NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "status" "PreRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "studentId" TEXT,
    "requestedFieldOfStudyId" INTEGER,
    "admittedFieldOfStudyId" INTEGER,
    "assignedClassGroupId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "livingSituation" "LivingSituation" NOT NULL,
    "birthCertificateSeries" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "isLeftHanded" BOOLEAN NOT NULL DEFAULT false,
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "disabilityDescription" TEXT,
    "hasChronicDisease" BOOLEAN NOT NULL DEFAULT false,
    "chronicDiseaseDescription" TEXT,
    "hasSpecialMedication" BOOLEAN NOT NULL DEFAULT false,
    "specialMedicationDescription" TEXT,
    "lastYearAverage" DECIMAL(4,2),
    "lastYearMathScore" DECIMAL(4,2),
    "lastYearDisciplineScore" DECIMAL(4,2),
    "lastYearEducationLevel" TEXT,
    "previousSchoolName" TEXT,
    "previousSchoolAddress" TEXT,
    "previousSchoolPhone" TEXT,
    "photoPath" TEXT,
    "photoUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreRegistrationParent" (
    "id" TEXT NOT NULL,
    "preRegistrationId" TEXT NOT NULL,
    "relation" "ParentRelationType" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT,
    "birthCertificateNumber" TEXT,
    "mobilePhone" TEXT,
    "educationLevel" "EducationLevel",
    "jobTitle" TEXT,
    "birthPlace" TEXT,
    "idCardIssuePlace" TEXT,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "homeAddress" TEXT,
    "workAddress" TEXT,
    "workPhone" TEXT,
    "hasWarParticipation" BOOLEAN NOT NULL DEFAULT false,
    "veteranPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreRegistrationParent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreRegistration_academicYearId_idx" ON "PreRegistration"("academicYearId");

-- CreateIndex
CREATE INDEX "PreRegistration_requestedFieldOfStudyId_idx" ON "PreRegistration"("requestedFieldOfStudyId");

-- CreateIndex
CREATE INDEX "PreRegistration_admittedFieldOfStudyId_idx" ON "PreRegistration"("admittedFieldOfStudyId");

-- CreateIndex
CREATE INDEX "PreRegistration_assignedClassGroupId_idx" ON "PreRegistration"("assignedClassGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "PreRegistration_nationalId_academicYearId_key" ON "PreRegistration"("nationalId", "academicYearId");

-- CreateIndex
CREATE INDEX "PreRegistrationParent_preRegistrationId_idx" ON "PreRegistrationParent"("preRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldOfStudy_name_schoolType_shift_key" ON "FieldOfStudy"("name", "schoolType", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_personnelCode_key" ON "Teacher"("personnelCode");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_nationalId_key" ON "Teacher"("nationalId");

-- AddForeignKey
ALTER TABLE "PreRegistration" ADD CONSTRAINT "PreRegistration_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistration" ADD CONSTRAINT "PreRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistration" ADD CONSTRAINT "PreRegistration_requestedFieldOfStudyId_fkey" FOREIGN KEY ("requestedFieldOfStudyId") REFERENCES "FieldOfStudy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistration" ADD CONSTRAINT "PreRegistration_admittedFieldOfStudyId_fkey" FOREIGN KEY ("admittedFieldOfStudyId") REFERENCES "FieldOfStudy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistration" ADD CONSTRAINT "PreRegistration_assignedClassGroupId_fkey" FOREIGN KEY ("assignedClassGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistrationParent" ADD CONSTRAINT "PreRegistrationParent_preRegistrationId_fkey" FOREIGN KEY ("preRegistrationId") REFERENCES "PreRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
