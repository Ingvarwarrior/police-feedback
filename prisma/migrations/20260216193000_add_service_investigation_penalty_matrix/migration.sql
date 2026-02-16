-- Add per-officer sanctions and conclusion/order metadata for service investigations
ALTER TABLE "UnifiedRecord" ADD COLUMN "investigationPenaltyItems" TEXT;
ALTER TABLE "UnifiedRecord" ADD COLUMN "investigationConclusionApprovedAt" DATETIME;
ALTER TABLE "UnifiedRecord" ADD COLUMN "investigationPenaltyByArticle13" BOOLEAN;
ALTER TABLE "UnifiedRecord" ADD COLUMN "investigationPenaltyOrderNumber" TEXT;
ALTER TABLE "UnifiedRecord" ADD COLUMN "investigationPenaltyOrderDate" DATETIME;
