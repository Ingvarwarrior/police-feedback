-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "opensAt" DATETIME,
    "closesAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Response" (
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
    CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    CONSTRAINT "Contact_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeoPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "accuracyMeters" REAL,
    "source" TEXT NOT NULL,
    "precisionMode" TEXT NOT NULL DEFAULT 'approx',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeoPoint_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT,
    "storage" TEXT NOT NULL DEFAULT 'local',
    "mediaType" TEXT NOT NULL DEFAULT 'photo',
    "pathOrKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "exifStripped" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Response_clientGeneratedId_key" ON "Response"("clientGeneratedId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_responseId_key" ON "Contact"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "GeoPoint_responseId_key" ON "GeoPoint"("responseId");
