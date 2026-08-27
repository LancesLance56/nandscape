-- CreateTable
CREATE TABLE "diagram_presets" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "group" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "spec" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagram_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagram_presets_slug_key" ON "diagram_presets"("slug");

-- CreateIndex
CREATE INDEX "diagram_presets_kind_group_position_idx" ON "diagram_presets"("kind", "group", "position");
