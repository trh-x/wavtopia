-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "stem_downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stem_plays" INTEGER NOT NULL DEFAULT 0;
