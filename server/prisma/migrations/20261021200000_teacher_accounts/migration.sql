ALTER TABLE "Teacher" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

CREATE TABLE "ActionToken" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActionToken_tokenHash_key" ON "ActionToken"("tokenHash");
CREATE INDEX "ActionToken_teacherId_purpose_idx" ON "ActionToken"("teacherId", "purpose");
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
