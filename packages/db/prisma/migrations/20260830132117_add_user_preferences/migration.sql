-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" TEXT NOT NULL,
    "focus_track_slug" TEXT,
    "weekly_goal" INTEGER NOT NULL DEFAULT 3,
    "preferred_difficulty" "Difficulty",
    "pinned_project_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hidden_widgets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
