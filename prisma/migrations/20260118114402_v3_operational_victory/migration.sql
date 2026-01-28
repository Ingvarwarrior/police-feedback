-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Response" ("badgeNumber", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentType", "interactionDate", "ipHash", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "responseTimeBucket", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact") SELECT "badgeNumber", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentType", "interactionDate", "ipHash", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "responseTimeBucket", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact" FROM "Response";
DROP TABLE "Response";
ALTER TABLE "new_Response" RENAME TO "Response";
CREATE UNIQUE INDEX "Response_clientGeneratedId_key" ON "Response"("clientGeneratedId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "permViewReports" BOOLEAN NOT NULL DEFAULT true,
    "permManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "permEditNotes" BOOLEAN NOT NULL DEFAULT true,
    "permChangeStatus" BOOLEAN NOT NULL DEFAULT true,
    "permExportData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "passwordHash", "role") SELECT "active", "createdAt", "email", "id", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
