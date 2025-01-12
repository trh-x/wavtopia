import { FeatureFlag, User } from "@wavtopia/core-storage";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function isFeatureEnabled(
  flagName: string,
  user?: User | null
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { name: flagName },
  });

  if (!flag) {
    return false; // Feature doesn't exist, so it's disabled
  }

  // If no user is provided, return the global flag status
  if (!user) {
    return flag.isEnabled;
  }

  // Check for user-specific override
  const userFeature = await prisma.userFeature.findUnique({
    where: {
      userId_featureFlagId: {
        userId: user.id,
        featureFlagId: flag.id,
      },
    },
  });

  // User override exists, return its value
  if (userFeature) {
    return userFeature.isEnabled;
  }

  // No user override, return global flag status
  return flag.isEnabled;
}

export async function setFeatureFlag(
  flagName: string,
  enabled: boolean,
  description?: string
): Promise<FeatureFlag> {
  return prisma.featureFlag.upsert({
    where: { name: flagName },
    update: { isEnabled: enabled, description },
    create: { name: flagName, isEnabled: enabled, description },
  });
}

export async function setUserFeatureFlag(
  userId: string,
  flagName: string,
  enabled: boolean
): Promise<void> {
  const flag = await prisma.featureFlag.findUnique({
    where: { name: flagName },
  });

  if (!flag) {
    throw new AppError(404, `Feature flag '${flagName}' not found`);
  }

  await prisma.userFeature.upsert({
    where: {
      userId_featureFlagId: {
        userId,
        featureFlagId: flag.id,
      },
    },
    update: { isEnabled: enabled },
    create: {
      userId,
      featureFlagId: flag.id,
      isEnabled: enabled,
    },
  });
}

// Convenience function to check early access status
export async function isEarlyAccessRequired(
  user?: User | null
): Promise<boolean> {
  return isFeatureEnabled("EARLY_ACCESS_REQUIRED", user);
}

export async function getEnabledFeatureFlags(
  userId: string
): Promise<string[]> {
  // Get all feature flags
  const allFlags = await prisma.featureFlag.findMany({
    include: {
      userFeatures: {
        where: { userId },
      },
    },
  });

  // Return names of flags that are either globally enabled or enabled for this user
  return allFlags
    .filter((flag) => {
      const userOverride = flag.userFeatures[0];
      return userOverride ? userOverride.isEnabled : flag.isEnabled;
    })
    .map((flag) => flag.name);
}
