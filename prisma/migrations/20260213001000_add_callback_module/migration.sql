-- CreateTable
CREATE TABLE "Callback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callDate" DATETIME NOT NULL,
    "eoNumber" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantPhone" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "createdById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qPoliteness" INTEGER,
    "qProfessionalism" INTEGER,
    "qLawfulness" INTEGER,
    "qResponseSpeed" INTEGER,
    "qHelpfulness" INTEGER,
    "qOverall" INTEGER,
    "surveyNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Callback_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Callback_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CallbackOfficers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CallbackOfficers_A_fkey" FOREIGN KEY ("A") REFERENCES "Callback" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CallbackOfficers_B_fkey" FOREIGN KEY ("B") REFERENCES "Officer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Callback_eoNumber_idx" ON "Callback"("eoNumber");

-- CreateIndex
CREATE INDEX "Callback_callDate_idx" ON "Callback"("callDate");

-- CreateIndex
CREATE INDEX "Callback_status_idx" ON "Callback"("status");

-- CreateIndex
CREATE UNIQUE INDEX "_CallbackOfficers_AB_unique" ON "_CallbackOfficers"("A", "B");

-- CreateIndex
CREATE INDEX "_CallbackOfficers_B_index" ON "_CallbackOfficers"("B");
