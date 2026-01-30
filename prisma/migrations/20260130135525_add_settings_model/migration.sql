-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "unitName" TEXT NOT NULL DEFAULT 'Патрульна поліція Хмільницького району',
    "unitAddress" TEXT NOT NULL DEFAULT '',
    "emergencyPhone" TEXT NOT NULL DEFAULT '102',
    "criticalRatingThreshold" REAL NOT NULL DEFAULT 2.5,
    "piiRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Вітаємо в системі відгуків про роботу патрульної поліції.',
    "warningKeywords" TEXT NOT NULL DEFAULT 'корупція, хабар, насилля, катування',
    "updatedAt" DATETIME NOT NULL
);
