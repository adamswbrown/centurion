-- DropForeignKey
ALTER TABLE "bootcamp_attendees" DROP CONSTRAINT IF EXISTS "bootcamp_attendees_bootcampId_fkey";
ALTER TABLE "bootcamp_attendees" DROP CONSTRAINT IF EXISTS "bootcamp_attendees_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "bootcamp_attendees";
DROP TABLE IF EXISTS "bootcamps";
