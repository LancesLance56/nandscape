-- AlterTable
ALTER TABLE "projects" ADD COLUMN "scopes" JSONB NOT NULL DEFAULT '[]';
