import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { LicenseType } from "@wavtopia/core-storage";

const router = Router();

// Then sort them in our preferred order
const TYPE_ORDER: Record<LicenseType, number> = {
  [LicenseType.CC_BY_NC_SA]: 1,
  [LicenseType.CC_BY_SA]: 2,
  [LicenseType.CC_BY_NC]: 3,
  [LicenseType.CC_BY]: 4,
  [LicenseType.CC_BY_ND]: 7,
  [LicenseType.CC_BY_NC_ND]: 8,
  [LicenseType.ALL_RIGHTS_RESERVED]: 5,
  [LicenseType.CUSTOM]: 6,
};

/**
 * Get all enabled licenses
 * GET /licenses
 *
 * Orders licenses to encourage collaborative sharing:
 * 1. CC BY-NC-SA (recommended for most users)
 * 2. CC BY-SA (for those okay with commercial use)
 * 3. CC BY-NC (for non-commercial without share requirement)
 * 4. CC BY (most permissive)
 * 5. All Rights Reserved (least collaborative)
 */
router.get("/", authenticate, async (req, res) => {
  // First get all enabled licenses
  const licenses = await prisma.license.findMany({
    where: {
      enabled: true,
    },
  });

  const sortedLicenses = licenses.sort(
    (a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
  );

  res.json(sortedLicenses);
});

export default router;
