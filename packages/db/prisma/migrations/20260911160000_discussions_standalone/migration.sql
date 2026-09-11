-- Follows are removed, and discussions gain standalone threads.
--
-- The follow graph went away with the feed it existed to filter: with no
-- "recently active" rail there was nothing reading the edge, and a social
-- graph nobody queries is a liability rather than a feature.
DROP TABLE IF EXISTS "follows";

-- A thread attached to nothing. Its slug is its own rather than a piece of
-- content's, which keeps a standalone discussion the same row shape as an
-- attached one instead of needing a second table.
ALTER TYPE "ContentKind" ADD VALUE 'GENERAL';

-- Only the opening post of a GENERAL thread carries one; every attached
-- discussion still takes its heading from the content it hangs off.
ALTER TABLE "discussion_posts" ADD COLUMN "title" TEXT;
