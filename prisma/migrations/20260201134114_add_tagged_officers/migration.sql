-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "_TaggedOfficers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TaggedOfficers_A_fkey" FOREIGN KEY ("A") REFERENCES "Officer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TaggedOfficers_B_fkey" FOREIGN KEY ("B") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Officer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "rank" TEXT,
    "department" TEXT,
    "imageUrl" TEXT,
    "phone" TEXT,
    "hireDate" DATETIME,
    "birthDate" DATETIME,
    "email" TEXT,
    "driversLicense" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "avgScore" REAL NOT NULL DEFAULT 0,
    "totalEvaluations" INTEGER NOT NULL DEFAULT 0,
    "totalResponses" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Officer" ("badgeNumber", "birthDate", "createdAt", "department", "driversLicense", "email", "firstName", "hireDate", "id", "imageUrl", "lastName", "middleName", "phone", "rank", "status", "updatedAt") SELECT "badgeNumber", "birthDate", "createdAt", "department", "driversLicense", "email", "firstName", "hireDate", "id", "imageUrl", "lastName", "middleName", "phone", "rank", "status", "updatedAt" FROM "Officer";
DROP TABLE "Officer";
ALTER TABLE "new_Officer" RENAME TO "Officer";
CREATE UNIQUE INDEX "Officer_badgeNumber_key" ON "Officer"("badgeNumber");
CREATE INDEX "Officer_lastName_firstName_idx" ON "Officer"("lastName", "firstName");
CREATE INDEX "Officer_badgeNumber_idx" ON "Officer"("badgeNumber");
CREATE INDEX "Officer_avgScore_idx" ON "Officer"("avgScore");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_TaggedOfficers_AB_unique" ON "_TaggedOfficers"("A", "B");

-- CreateIndex
CREATE INDEX "_TaggedOfficers_B_index" ON "_TaggedOfficers"("B");
