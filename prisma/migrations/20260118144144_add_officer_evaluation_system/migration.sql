-- CreateTable
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "rank" TEXT,
    "department" TEXT,
    "hireDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE'
);

-- CreateTable
CREATE TABLE "OfficerEvaluation" (
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
    CONSTRAINT "OfficerEvaluation_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfficerEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "actorUserId", "createdAt", "entityId", "entityType", "id", "metadata") SELECT "action", "actorUserId", "createdAt", "entityId", "entityType", "id", "metadata" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
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
    "officerId" TEXT,
    CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Response" ("assignedToId", "badgeNumber", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentCategory", "incidentType", "interactionDate", "interactionTime", "internalNotes", "ipHash", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "resolutionDate", "resolutionNotes", "responseTimeBucket", "status", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact") SELECT "assignedToId", "badgeNumber", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentCategory", "incidentType", "interactionDate", "interactionTime", "internalNotes", "ipHash", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "resolutionDate", "resolutionNotes", "responseTimeBucket", "status", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact" FROM "Response";
DROP TABLE "Response";
ALTER TABLE "new_Response" RENAME TO "Response";
CREATE UNIQUE INDEX "Response_clientGeneratedId_key" ON "Response"("clientGeneratedId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Officer_badgeNumber_key" ON "Officer"("badgeNumber");
