-- The problem statement moves from a ContentBlock[] JSON array to Markdown.
--
-- `body` is dropped rather than converted: the only rows are the three seeded
-- problems, whose Markdown is authored in seed/practices/*.json and re-applied
-- by `node seed/seed.mjs --force`. Converting block arrays to Markdown in SQL
-- would be a one-shot script carrying more risk than re-seeding content that
-- lives in the repo anyway.
ALTER TABLE "CodingProblem" DROP COLUMN "body";
ALTER TABLE "CodingProblem" ADD COLUMN "statement" TEXT NOT NULL DEFAULT '';
