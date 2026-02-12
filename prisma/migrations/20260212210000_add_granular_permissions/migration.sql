-- Add granular user-management permissions
ALTER TABLE "User" ADD COLUMN "permViewUsers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "permCreateUsers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "permEditUsers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "permDeleteUsers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "permResetUserPasswords" BOOLEAN NOT NULL DEFAULT false;

-- Add granular unified-record permissions
ALTER TABLE "User" ADD COLUMN "permImportUnifiedRecords" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "permDeleteUnifiedRecords" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "permReturnUnifiedRecords" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "permUseAiExtraction" BOOLEAN NOT NULL DEFAULT false;
