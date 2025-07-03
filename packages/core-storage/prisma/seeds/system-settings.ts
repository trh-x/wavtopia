/// <reference types="node" />
import {
  PrismaClient,
  SystemSettingKey,
  SystemSettingValueType,
} from ".prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = [
  {
    key: SystemSettingKey.FREE_STORAGE_QUOTA_SECONDS,
    valueType: SystemSettingValueType.NUMBER,
    numberValue: 600 * 60, // 10 hours in seconds
    description: "Default free storage quota for new users",
  },
] as const;

export async function seedSystemSettings() {
  console.log("Seeding system settings...");

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        valueType: setting.valueType,
        numberValue: setting.numberValue,
        description: setting.description,
      },
      create: {
        key: setting.key,
        valueType: setting.valueType,
        numberValue: setting.numberValue,
        description: setting.description,
      },
    });
  }

  console.log("System settings seeded successfully");
}
