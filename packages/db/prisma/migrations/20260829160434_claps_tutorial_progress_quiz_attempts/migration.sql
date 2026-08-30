-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('BLOG', 'TUTORIAL');

-- CreateTable
CREATE TABLE "claps" (
    "id" TEXT NOT NULL,
    "targetKind" "ContentKind" NOT NULL,
    "targetSlug" TEXT NOT NULL,
    "clapperId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "page_slug" TEXT NOT NULL,
    "track_slug" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutorial_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quiz_key" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claps_targetKind_targetSlug_idx" ON "claps"("targetKind", "targetSlug");

-- CreateIndex
CREATE UNIQUE INDEX "claps_targetKind_targetSlug_clapperId_key" ON "claps"("targetKind", "targetSlug", "clapperId");

-- CreateIndex
CREATE INDEX "tutorial_progress_userId_idx" ON "tutorial_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_progress_userId_page_slug_key" ON "tutorial_progress"("userId", "page_slug");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_quiz_key_idx" ON "quiz_attempts"("userId", "quiz_key");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_created_at_idx" ON "quiz_attempts"("userId", "created_at");

-- AddForeignKey
ALTER TABLE "tutorial_progress" ADD CONSTRAINT "tutorial_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
