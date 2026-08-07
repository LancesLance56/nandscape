-- DropForeignKey
ALTER TABLE "Puzzle" DROP CONSTRAINT "Puzzle_creatorId_fkey";

-- AlterTable
ALTER TABLE "Puzzle" ALTER COLUMN "creatorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
