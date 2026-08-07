-- CreateTable
CREATE TABLE "tutorial_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tutorial_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_image" TEXT,
    "author_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "body" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "section_id" UUID,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutorial_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_sections_slug_key" ON "tutorial_sections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_pages_slug_key" ON "tutorial_pages"("slug");

-- CreateIndex
CREATE INDEX "tutorial_pages_status_idx" ON "tutorial_pages"("status");

-- CreateIndex
CREATE INDEX "tutorial_pages_section_id_position_idx" ON "tutorial_pages"("section_id", "position");

-- AddForeignKey
ALTER TABLE "tutorial_pages" ADD CONSTRAINT "tutorial_pages_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "tutorial_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
