/*
  Warnings:

  - A unique constraint covering the columns `[academicYearId,code]` on the table `ClassGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ClassGroup_academicYearId_code_key" ON "ClassGroup"("academicYearId", "code");
