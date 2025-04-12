/// <reference types="node" />
import {
  PrismaClient,
  SystemSettingKey,
  SystemSettingValueType,
} from ".prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = [
  {
    key: SystemSettingKey.FREE_STORAGE_QUOTA_BYTES,
    valueType: SystemSettingValueType.NUMBER,
    numberValue: 1024 * 1024 * 1024, // 1GB in bytes
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
