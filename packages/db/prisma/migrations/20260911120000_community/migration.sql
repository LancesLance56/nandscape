-- Community: one-directional follows, and discussions scoped to content.
--
-- ContentKind grows rather than a second enum appearing, because a discussion
-- is addressed exactly the way a clap already is: a kind plus a slug. Adding a
-- value to an enum inside a transaction is allowed from Postgres 12 on (this
-- stack runs 16) provided the new value is not *used* in the same transaction.
-- Nothing below writes one, so this is safe as a single migration.
ALTER TYPE "ContentKind" ADD VALUE 'PRACTICE';
ALTER TYPE "ContentKind" ADD VALUE 'PROJECT';
ALTER TYPE "ContentKind" ADD VALUE 'PUZZLE';

-- Nullable: every existing account predates profiles and has nothing to say
-- yet, and an empty string would render as a blank line rather than no line.
ALTER TABLE "User" ADD COLUMN "bio" TEXT;

CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- The pair is unique, which is what makes following idempotent: a double-tap
-- cannot leave two rows behind.
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");
-- The pair index above only serves lookups leading with follower_id, so the
-- followers direction needs its own.
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

CREATE TABLE "discussion_posts" (
    "id" TEXT NOT NULL,
    "targetKind" "ContentKind" NOT NULL,
    "target_slug" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "code" TEXT,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "discussion_posts_targetKind_target_slug_idx" ON "discussion_posts"("targetKind", "target_slug");
CREATE INDEX "discussion_posts_author_id_idx" ON "discussion_posts"("author_id");
CREATE INDEX "discussion_posts_parent_id_idx" ON "discussion_posts"("parent_id");

-- The composite primary key *is* the one-vote-per-person rule. No separate
-- unique constraint, and no way to write a duplicate.
CREATE TABLE "discussion_votes" (
    "post_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_votes_pkey" PRIMARY KEY ("post_id", "voter_id")
);

CREATE INDEX "discussion_votes_voter_id_idx" ON "discussion_votes"("voter_id");

ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "discussion_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "discussion_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
