import { Router } from "express";
import { trackCoreRoutes } from "./core";
import { trackMediaRoutes } from "./media";
import { trackSharingRoutes } from "./sharing";
import { trackUsageRoutes } from "./usage";
import { trackForkRoutes } from "./fork";

const router = Router();

router.use(trackCoreRoutes);
router.use(trackMediaRoutes);
router.use(trackSharingRoutes);
router.use(trackUsageRoutes);
router.use(trackForkRoutes);

export { router as trackRoutes };
