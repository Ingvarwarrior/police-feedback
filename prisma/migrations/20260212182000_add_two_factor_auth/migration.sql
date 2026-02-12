-- Add two-factor authentication fields to User
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecretEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorTempSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEnabledAt" DATETIME;
