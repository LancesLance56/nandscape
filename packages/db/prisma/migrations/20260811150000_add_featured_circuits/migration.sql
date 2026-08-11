-- CreateTable
CREATE TABLE "featured_circuits" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_circuits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "featured_circuits_project_id_idx" ON "featured_circuits"("project_id");

-- CreateIndex
CREATE INDEX "featured_circuits_active_idx" ON "featured_circuits"("active");

-- AddForeignKey
ALTER TABLE "featured_circuits" ADD CONSTRAINT "featured_circuits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
