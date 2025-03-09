import { Router } from "express";
import { trackCoreRoutes } from "./core";
import { trackMediaRoutes } from "./media";
import { trackSharingRoutes } from "./sharing";

const router = Router();

router.use(trackCoreRoutes);
router.use(trackMediaRoutes);
router.use(trackSharingRoutes);

export { router as trackRoutes };
