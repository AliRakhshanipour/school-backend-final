/*
  Warnings:

  - Added the required column `contactPhone` to the `PreRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PreRegistrationParent" DROP CONSTRAINT "PreRegistrationParent_preRegistrationId_fkey";

-- AlterTable
ALTER TABLE "PreRegistration" ADD COLUMN     "contactPhone" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "PreRegistrationParent" ADD CONSTRAINT "PreRegistrationParent_preRegistrationId_fkey" FOREIGN KEY ("preRegistrationId") REFERENCES "PreRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
