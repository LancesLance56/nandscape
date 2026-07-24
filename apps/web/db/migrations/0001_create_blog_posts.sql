CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS blog_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT UNIQUE NOT NULL,
    title         TEXT NOT NULL,
    excerpt       TEXT,
    cover_image   TEXT,
    author_name   TEXT,
    status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'archived')),
    body          JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags          TEXT[] NOT NULL DEFAULT '{}',
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_blog_posts_body ON blog_posts USING GIN (body);

CREATE OR REPLACE FUNCTION set_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION set_blog_posts_updated_at();
