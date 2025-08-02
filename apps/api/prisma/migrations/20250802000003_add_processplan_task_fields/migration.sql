-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "processplan_assigned_to" TEXT,
ADD COLUMN     "processplan_completed_steps" INTEGER,
ADD COLUMN     "processplan_dependencies" JSONB,
ADD COLUMN     "processplan_estimated_duration" INTEGER,
ADD COLUMN     "processplan_order" INTEGER,
ADD COLUMN     "processplan_process_id" TEXT,
ADD COLUMN     "processplan_process_name" TEXT,
ADD COLUMN     "processplan_progress" DOUBLE PRECISION,
ADD COLUMN     "processplan_status" TEXT,
ADD COLUMN     "processplan_step_id" TEXT,
ADD COLUMN     "processplan_tags" JSONB,
ADD COLUMN     "processplan_total_steps" INTEGER,
ADD COLUMN     "processplan_type" TEXT;
