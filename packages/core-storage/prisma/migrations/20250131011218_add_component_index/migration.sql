/*
  Warnings:

  - A unique constraint covering the columns `[track_id,index]` on the table `components` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `index` to the `components` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "components" ADD COLUMN "index" INTEGER;

-- Add the unique constraint
CREATE UNIQUE INDEX "components_track_id_index_key" ON "components"("track_id", "index");

-- Make the column required
ALTER TABLE "components" ALTER COLUMN "index" SET NOT NULL;
