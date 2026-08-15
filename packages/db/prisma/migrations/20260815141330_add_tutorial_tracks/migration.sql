-- AlterTable
ALTER TABLE "tutorial_sections" ADD COLUMN     "track_id" UUID;

-- CreateTable
CREATE TABLE "tutorial_tracks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tutorial_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_tracks_slug_key" ON "tutorial_tracks"("slug");

-- CreateIndex
CREATE INDEX "tutorial_sections_track_id_position_idx" ON "tutorial_sections"("track_id", "position");

-- AddForeignKey
ALTER TABLE "tutorial_sections" ADD CONSTRAINT "tutorial_sections_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tutorial_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
