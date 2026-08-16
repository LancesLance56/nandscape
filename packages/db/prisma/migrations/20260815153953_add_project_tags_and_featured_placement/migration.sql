-- CreateEnum
CREATE TYPE "FeaturedPlacement" AS ENUM ('HOMEPAGE_DEMO', 'COMMUNITY_WEEKLY');

-- DropIndex
DROP INDEX "featured_circuits_active_idx";

-- AlterTable
ALTER TABLE "featured_circuits" ADD COLUMN     "placement" "FeaturedPlacement" NOT NULL DEFAULT 'HOMEPAGE_DEMO';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "featured_circuits_placement_active_idx" ON "featured_circuits"("placement", "active");
