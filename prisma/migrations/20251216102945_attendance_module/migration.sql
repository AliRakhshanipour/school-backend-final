-- 1) اضافه کردن ستون به صورت nullable
ALTER TABLE "StudentAttendance" ADD COLUMN "markedByUserId" TEXT;

-- 2) پر کردن مقدار برای ردیف‌های قبلی:
-- چون قبلاً markedByTeacherId داشتی، از Teacher.userId پر می‌کنیم
UPDATE "StudentAttendance" sa
SET "markedByUserId" = t."userId"
FROM "Teacher" t
WHERE sa."markedByTeacherId" IS NOT NULL
  AND sa."markedByTeacherId" = t."id"
  AND sa."markedByUserId" IS NULL;

-- 3) اگر هنوز ردیف بدون مقدار ماند، از اولین ادمین سیستم پر می‌کنیم
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "StudentAttendance" WHERE "markedByUserId" IS NULL) THEN
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN') THEN
      RAISE EXCEPTION 'No ADMIN user found to backfill markedByUserId. Create an ADMIN user first, then rerun migrate.';
    END IF;

    UPDATE "StudentAttendance"
    SET "markedByUserId" = (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1)
    WHERE "markedByUserId" IS NULL;
  END IF;
END $$;

-- 4) حالا اجباری‌اش کن
ALTER TABLE "StudentAttendance" ALTER COLUMN "markedByUserId" SET NOT NULL;

-- 5) FK به User اضافه کن (اگر Prisma خودش اضافه نکرده بود)
ALTER TABLE "StudentAttendance"
ADD CONSTRAINT "StudentAttendance_markedByUserId_fkey"
FOREIGN KEY ("markedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
