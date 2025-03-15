/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `licenses` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "licenses_name_key" ON "licenses"("name");
