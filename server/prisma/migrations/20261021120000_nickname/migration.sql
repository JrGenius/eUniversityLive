-- Remplace prénom / nom / matricule par nom complet (privé) + pseudo public.
DROP INDEX "Participant_sessionId_studentId_key";

ALTER TABLE "Participant" ADD COLUMN "fullName" TEXT, ADD COLUMN "nickname" TEXT, ADD COLUMN "nicknameKey" TEXT;
UPDATE "Participant" SET "fullName" = "firstName" || ' ' || "lastName",
  "nickname" = "firstName" || ' ' || left("lastName", 1) || '.',
  "nicknameKey" = lower("firstName" || ' ' || left("lastName", 1) || '.') || '#' || left("id", 4);
UPDATE "Participant" SET "nickname" = "nickname" || ' (' || left("id", 4) || ')' WHERE true;
ALTER TABLE "Participant" ALTER COLUMN "fullName" SET NOT NULL, ALTER COLUMN "nickname" SET NOT NULL, ALTER COLUMN "nicknameKey" SET NOT NULL;
ALTER TABLE "Participant" DROP COLUMN "firstName", DROP COLUMN "lastName", DROP COLUMN "studentId";

CREATE UNIQUE INDEX "Participant_sessionId_nicknameKey_key" ON "Participant"("sessionId", "nicknameKey");
