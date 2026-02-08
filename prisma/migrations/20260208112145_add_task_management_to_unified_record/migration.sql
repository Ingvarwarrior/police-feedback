-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UnifiedRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eoNumber" TEXT NOT NULL,
    "eoDate" DATETIME NOT NULL,
    "district" TEXT,
    "address" TEXT,
    "description" TEXT,
    "applicant" TEXT,
    "category" TEXT,
    "recordType" TEXT NOT NULL DEFAULT 'EO',
    "officerName" TEXT,
    "assignedUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deadline" DATETIME,
    "processedAt" DATETIME,
    "extensionStatus" TEXT,
    "extensionReason" TEXT,
    "extensionDeadline" DATETIME,
    "resolution" TEXT,
    "resolutionDate" DATETIME,
    "sourceFile" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnifiedRecord_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UnifiedRecord" ("address", "applicant", "assignedUserId", "category", "createdAt", "description", "district", "eoDate", "eoNumber", "id", "importedAt", "officerName", "recordType", "resolution", "resolutionDate", "sourceFile", "updatedAt") SELECT "address", "applicant", "assignedUserId", "category", "createdAt", "description", "district", "eoDate", "eoNumber", "id", "importedAt", "officerName", "recordType", "resolution", "resolutionDate", "sourceFile", "updatedAt" FROM "UnifiedRecord";
DROP TABLE "UnifiedRecord";
ALTER TABLE "new_UnifiedRecord" RENAME TO "UnifiedRecord";
CREATE UNIQUE INDEX "UnifiedRecord_eoNumber_key" ON "UnifiedRecord"("eoNumber");
CREATE INDEX "UnifiedRecord_eoNumber_idx" ON "UnifiedRecord"("eoNumber");
CREATE INDEX "UnifiedRecord_eoDate_idx" ON "UnifiedRecord"("eoDate");
CREATE INDEX "UnifiedRecord_category_idx" ON "UnifiedRecord"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
