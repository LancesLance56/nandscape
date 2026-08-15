-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "seo_description" TEXT,
ADD COLUMN     "seo_title" TEXT;

-- AlterTable
ALTER TABLE "tutorial_pages" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "seo_description" TEXT,
ADD COLUMN     "seo_title" TEXT;
