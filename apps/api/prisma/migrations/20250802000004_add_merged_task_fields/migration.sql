-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "is_merged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merged_task_id" UUID;

-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "config" JSONB,
ADD COLUMN     "last_sync_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "merged_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT,
    "due_date" TIMESTAMPTZ,
    "merged_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "merged_by" TEXT NOT NULL DEFAULT 'auto',
    "confidence" REAL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "merged_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merged_task_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merged_task_id" UUID NOT NULL,
    "original_task_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "original_title" TEXT NOT NULL,
    "original_description" TEXT,
    "original_status" TEXT NOT NULL,
    "integration_id" UUID NOT NULL,
    "last_sync_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "merged_task_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task1_id" UUID NOT NULL,
    "task2_id" UUID NOT NULL,
    "title_similarity" REAL NOT NULL,
    "description_similarity" REAL NOT NULL,
    "temporal_proximity" REAL NOT NULL,
    "assignee_match" REAL NOT NULL,
    "priority_match" REAL NOT NULL,
    "overall_score" REAL NOT NULL,
    "confidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "duplicate_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_merged_task_id_idx" ON "tasks"("merged_task_id");

-- CreateIndex
CREATE INDEX "merged_tasks_user_id_idx" ON "merged_tasks"("user_id");

-- CreateIndex
CREATE INDEX "merged_task_sources_merged_task_id_idx" ON "merged_task_sources"("merged_task_id");

-- CreateIndex
CREATE INDEX "duplicate_candidates_overall_score_idx" ON "duplicate_candidates"("overall_score" DESC);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_merged_task_id_fkey" FOREIGN KEY ("merged_task_id") REFERENCES "merged_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_tasks" ADD CONSTRAINT "merged_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_task_sources" ADD CONSTRAINT "merged_task_sources_merged_task_id_fkey" FOREIGN KEY ("merged_task_id") REFERENCES "merged_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_task_sources" ADD CONSTRAINT "merged_task_sources_original_task_id_fkey" FOREIGN KEY ("original_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merged_task_sources" ADD CONSTRAINT "merged_task_sources_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_task1_id_fkey" FOREIGN KEY ("task1_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_task2_id_fkey" FOREIGN KEY ("task2_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
