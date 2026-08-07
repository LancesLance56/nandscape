-- CreateTable
CREATE TABLE "puzzle_progress" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzle_slug" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solved_at" TIMESTAMPTZ(6),
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puzzle_progress_userId_idx" ON "puzzle_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_progress_userId_puzzle_slug_key" ON "puzzle_progress"("userId", "puzzle_slug");

-- AddForeignKey
ALTER TABLE "puzzle_progress" ADD CONSTRAINT "puzzle_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
