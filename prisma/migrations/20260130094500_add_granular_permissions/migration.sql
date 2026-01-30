/*
  Warnings:

  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "AdminNotification" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Citizen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "phone" TEXT,
    "ipHash" TEXT,
    "fullName" TEXT,
    "internalNotes" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "CitizenPhone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "citizenId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CitizenPhone_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "citizenId" TEXT,
    CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Response_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Response" ("assignedToId", "badgeNumber", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentCategory", "incidentType", "interactionDate", "interactionTime", "internalNotes", "ipHash", "officerId", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "resolutionDate", "resolutionNotes", "responseTimeBucket", "status", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact") SELECT "assignedToId", "badgeNumber", "clientGeneratedId", "comment", "consent", "createdAt", "districtOrCity", "id", "incidentCategory", "incidentType", "interactionDate", "interactionTime", "internalNotes", "ipHash", "officerId", "officerName", "patrolRef", "rateEffectiveness", "rateOverall", "ratePoliteness", "rateProfessionalism", "resolutionDate", "resolutionNotes", "responseTimeBucket", "status", "submittedAt", "surveyId", "suspicious", "userAgent", "wantContact" FROM "Response";
DROP TABLE "Response";
ALTER TABLE "new_Response" RENAME TO "Response";
CREATE UNIQUE INDEX "Response_clientGeneratedId_key" ON "Response"("clientGeneratedId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "badgeNumber" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "permViewReports" BOOLEAN NOT NULL DEFAULT true,
    "permAssignReports" BOOLEAN NOT NULL DEFAULT false,
    "permViewSensitiveData" BOOLEAN NOT NULL DEFAULT false,
    "permBulkActionReports" BOOLEAN NOT NULL DEFAULT false,
    "permManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "permCreateOfficers" BOOLEAN NOT NULL DEFAULT false,
    "permEditOfficers" BOOLEAN NOT NULL DEFAULT false,
    "permDeleteOfficers" BOOLEAN NOT NULL DEFAULT false,
    "permViewOfficerStats" BOOLEAN NOT NULL DEFAULT false,
    "permCreateEvaluations" BOOLEAN NOT NULL DEFAULT false,
    "permManageOfficerStatus" BOOLEAN NOT NULL DEFAULT false,
    "permEditCitizens" BOOLEAN NOT NULL DEFAULT false,
    "permDeleteCitizens" BOOLEAN NOT NULL DEFAULT false,
    "permMarkSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "permEditNotes" BOOLEAN NOT NULL DEFAULT true,
    "permChangeStatus" BOOLEAN NOT NULL DEFAULT true,
    "permExportData" BOOLEAN NOT NULL DEFAULT false,
    "permDeleteReports" BOOLEAN NOT NULL DEFAULT false,
    "permViewAudit" BOOLEAN NOT NULL DEFAULT false,
    "permManageSettings" BOOLEAN NOT NULL DEFAULT false,
    "permManageMailAlerts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "badgeNumber", "createdAt", "email", "firstName", "id", "lastName", "passwordHash", "permChangeStatus", "permEditNotes", "permExportData", "permManageUsers", "permViewReports", "role") SELECT "active", "badgeNumber", "createdAt", "email", "firstName", "id", "lastName", "passwordHash", "permChangeStatus", "permEditNotes", "permExportData", "permManageUsers", "permViewReports", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_notificationId_userId_key" ON "NotificationRead"("notificationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_phone_key" ON "Citizen"("phone");

-- CreateIndex
CREATE INDEX "Citizen_ipHash_idx" ON "Citizen"("ipHash");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenPhone_phone_key" ON "CitizenPhone"("phone");
