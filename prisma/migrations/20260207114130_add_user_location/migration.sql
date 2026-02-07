-- AlterTable
ALTER TABLE "Officer" ADD COLUMN "address" TEXT;
ALTER TABLE "Officer" ADD COLUMN "education" TEXT;
ALTER TABLE "Officer" ADD COLUMN "serviceHistory" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLat" REAL;
ALTER TABLE "User" ADD COLUMN "lastLocationAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "lastLon" REAL;

-- CreateTable
CREATE TABLE "UnifiedRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eoNumber" TEXT NOT NULL,
    "eoDate" DATETIME NOT NULL,
    "district" TEXT,
    "address" TEXT,
    "description" TEXT,
    "applicant" TEXT,
    "category" TEXT,
    "officerName" TEXT,
    "assignedUserId" TEXT,
    "resolution" TEXT,
    "resolutionDate" DATETIME,
    "sourceFile" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnifiedRecord_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT,
    "storage" TEXT NOT NULL DEFAULT 'local',
    "mediaType" TEXT NOT NULL DEFAULT 'photo',
    "pathOrKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "exifStripped" BOOLEAN NOT NULL DEFAULT true,
    "evaluationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "OfficerEvaluation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attachment_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Attachment" ("createdAt", "exifStripped", "hash", "id", "mediaType", "mime", "pathOrKey", "responseId", "sizeBytes", "storage") SELECT "createdAt", "exifStripped", "hash", "id", "mediaType", "mime", "pathOrKey", "responseId", "sizeBytes", "storage" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
CREATE TABLE "new_OfficerEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "officerId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "type" TEXT NOT NULL,
    "sourceId" TEXT,
    "scoreKnowledge" INTEGER,
    "scoreTactics" INTEGER,
    "scoreCommunication" INTEGER,
    "scoreProfessionalism" INTEGER,
    "scorePhysical" INTEGER,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "recommendations" TEXT,
    "notes" TEXT,
    "issuesJson" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OfficerEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OfficerEvaluation_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OfficerEvaluation" ("createdAt", "evaluatorId", "id", "notes", "officerId", "recommendations", "scoreCommunication", "scoreKnowledge", "scorePhysical", "scoreProfessionalism", "scoreTactics", "sourceId", "strengths", "type", "weaknesses") SELECT "createdAt", "evaluatorId", "id", "notes", "officerId", "recommendations", "scoreCommunication", "scoreKnowledge", "scorePhysical", "scoreProfessionalism", "scoreTactics", "sourceId", "strengths", "type", "weaknesses" FROM "OfficerEvaluation";
DROP TABLE "OfficerEvaluation";
ALTER TABLE "new_OfficerEvaluation" RENAME TO "OfficerEvaluation";
CREATE TABLE "new_Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "clientGeneratedId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "consent" BOOLEAN NOT NULL,
    "wantContact" BOOLEAN NOT NULL,
    "districtOrCity" TEXT,
    "interactionDate" DATETIME,
    "interactionTime" TEXT,
    "incidentType" TEXT,
    "responseTimeBucket" TEXT,
    "patrolRef" TEXT,
    "officerName" TEXT,
    "badgeNumber" TEXT,
    "ratePoliteness" INTEGER,
    "rateProfessionalism" INTEGER,
    "rateEffectiveness" INTEGER,
    "rateOverall" INTEGER,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "internalNotes" TEXT,
    "assignedToId" TEXT,
    "resolutionNotes" TEXT,
    "resolutionDate" DATETIME,
    "incidentCategory" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "officerId" TEXT,
    "citizenId" TEXT,
    CONSTRAINT "Response_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Response" ("assignedToId", "badgeNumber", "citizenId", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentCategory", "incidentType", "interactionDate", "interactionTime", "internalNotes", "ipHash", "officerId", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "resolutionDate", "resolutionNotes", "responseTimeBucket", "status", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact") SELECT "assignedToId", "badgeNumber", "citizenId", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentCategory", "incidentType", "interactionDate", "interactionTime", "internalNotes", "ipHash", "officerId", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "resolutionDate", "resolutionNotes", "responseTimeBucket", "status", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact" FROM "Response";
DROP TABLE "Response";
ALTER TABLE "new_Response" RENAME TO "Response";
CREATE UNIQUE INDEX "Response_clientGeneratedId_key" ON "Response"("clientGeneratedId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedRecord_eoNumber_key" ON "UnifiedRecord"("eoNumber");

-- CreateIndex
CREATE INDEX "UnifiedRecord_eoNumber_idx" ON "UnifiedRecord"("eoNumber");

-- CreateIndex
CREATE INDEX "UnifiedRecord_eoDate_idx" ON "UnifiedRecord"("eoDate");

-- CreateIndex
CREATE INDEX "UnifiedRecord_category_idx" ON "UnifiedRecord"("category");
