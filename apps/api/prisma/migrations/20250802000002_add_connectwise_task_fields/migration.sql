-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "connectwise_assigned_to" TEXT,
ADD COLUMN     "connectwise_board_name" TEXT,
ADD COLUMN     "connectwise_company_name" TEXT,
ADD COLUMN     "connectwise_owner" TEXT,
ADD COLUMN     "connectwise_project_name" TEXT,
ADD COLUMN     "connectwise_ticket_id" INTEGER,
ADD COLUMN     "connectwise_ticket_type" TEXT;
