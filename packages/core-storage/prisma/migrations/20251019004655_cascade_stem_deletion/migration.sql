-- DropForeignKey
ALTER TABLE "daily_stem_stats" DROP CONSTRAINT "daily_stem_stats_stem_id_fkey";

-- DropForeignKey
ALTER TABLE "monthly_stem_stats" DROP CONSTRAINT "monthly_stem_stats_stem_id_fkey";

-- DropForeignKey
ALTER TABLE "stem_events" DROP CONSTRAINT "stem_events_stem_id_fkey";

-- DropForeignKey
ALTER TABLE "user_stem_activity" DROP CONSTRAINT "user_stem_activity_stem_id_fkey";

-- AddForeignKey
ALTER TABLE "stem_events" ADD CONSTRAINT "stem_events_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stem_activity" ADD CONSTRAINT "user_stem_activity_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stem_stats" ADD CONSTRAINT "daily_stem_stats_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_stem_stats" ADD CONSTRAINT "monthly_stem_stats_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
