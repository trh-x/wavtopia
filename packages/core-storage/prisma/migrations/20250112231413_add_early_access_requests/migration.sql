-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "early_access_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "invite_code_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "early_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "early_access_requests_email_key" ON "early_access_requests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "early_access_requests_invite_code_id_key" ON "early_access_requests"("invite_code_id");

-- AddForeignKey
ALTER TABLE "early_access_requests" ADD CONSTRAINT "early_access_requests_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "invite_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
