/// <reference types="node" />
import { PrismaClient, LicenseType } from ".prisma/client";

const prisma = new PrismaClient();

export async function seedLicenses() {
  const licenses = [
    // CC BY - Attribution
    {
      name: "Creative Commons Attribution 4.0",
      type: LicenseType.CC_BY,
      description:
        "This license lets others distribute, remix, adapt, and build upon your work, even commercially, as long as they credit you for the original creation.",
      usageDescription:
        "You can distribute, remix, adapt, and build upon this work, even commercially, as long as you credit the original creator.",
      allowsRemixing: true,
      allowsSharing: true,
      requiresAttribution: true,
      allowsCommercialUse: true,
      allowsStemSeparation: true,
      allowsStemSharing: true,
      requiresCredit: true,
      creditFormat: 'Track "{title}" by {artist} is licensed under CC BY 4.0',
      enabled: true,
    },

    // CC BY-SA - Attribution-ShareAlike
    {
      name: "Creative Commons Attribution-ShareAlike 4.0",
      type: LicenseType.CC_BY_SA,
      description:
        "This license lets others remix, adapt, and build upon your work even for commercial purposes, as long as they credit you and license their new creations under identical terms.",
      usageDescription:
        "You can remix, adapt, and build upon this work even for commercial purposes, as long as you credit the creator and license your new creations under identical terms.",
      allowsRemixing: true,
      allowsSharing: true,
      requiresAttribution: true,
      allowsCommercialUse: true,
      allowsStemSeparation: true,
      allowsStemSharing: true,
      requiresCredit: true,
      creditFormat:
        'Track "{title}" by {artist} is licensed under CC BY-SA 4.0. Remix must be shared under the same license.',
      enabled: true,
    },

    // CC BY-NC - Attribution-NonCommercial (Recommended for most users)
    {
      name: "Creative Commons Attribution-NonCommercial 4.0",
      type: LicenseType.CC_BY_NC,
      description:
        "This license lets others remix, adapt, and build upon your work non-commercially with attribution.",
      usageDescription:
        "You can remix, adapt, and build upon this work non-commercially, as long as you credit the creator.",
      allowsRemixing: true,
      allowsSharing: true,
      requiresAttribution: true,
      allowsCommercialUse: false,
      allowsStemSeparation: true,
      allowsStemSharing: true,
      requiresCredit: true,
      creditFormat:
        'Track "{title}" by {artist} is licensed under CC BY-NC 4.0',
      usageRestrictions:
        "No commercial use permitted without explicit permission from the creator.",
      enabled: true,
    },

    // CC BY-NC-SA - Attribution-NonCommercial-ShareAlike (Platform Default)
    {
      name: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
      type: LicenseType.CC_BY_NC_SA,
      description:
        "This license lets others remix, adapt, and build upon your work non-commercially, as long as they credit you and license their new creations under identical terms.",
      usageDescription:
        "You can remix, adapt, and build upon this work non-commercially, as long as you credit the creator and license your new creations under identical terms.",
      allowsRemixing: true,
      allowsSharing: true,
      requiresAttribution: true,
      allowsCommercialUse: false,
      allowsStemSeparation: true,
      allowsStemSharing: true,
      requiresCredit: true,
      creditFormat:
        'Track "{title}" by {artist} is licensed under CC BY-NC-SA 4.0. Remix must be shared under the same license.',
      usageRestrictions:
        "No commercial use permitted. Derivative works must be shared under the same license.",
      enabled: true,
    },

    // CC BY-ND - Attribution-NoDerivs
    {
      name: "Creative Commons Attribution-NoDerivs 4.0",
      type: LicenseType.CC_BY_ND,
      description:
        "This license allows for redistribution, commercial and non-commercial, as long as it is passed along unchanged and in whole, with credit to you.",
      usageDescription:
        "You can redistribute this work, commercially and non-commercially, as long as it is passed along unchanged and in whole, with credit to the creator.",
      allowsRemixing: false,
      allowsSharing: true,
      requiresAttribution: true,
      allowsCommercialUse: true,
      allowsStemSeparation: false,
      allowsStemSharing: false,
      requiresCredit: true,
      creditFormat:
        'Track "{title}" by {artist} is licensed under CC BY-ND 4.0',
      usageRestrictions: "No modifications or derivative works permitted.",
      enabled: false,
    },

    // CC BY-NC-ND - Attribution-NonCommercial-NoDerivs
    {
      name: "Creative Commons Attribution-NonCommercial-NoDerivs 4.0",
      type: LicenseType.CC_BY_NC_ND,
      description:
        "This license is the most restrictive of the six main CC licenses, only allowing others to download your works and share them with others as long as they credit you, but they can't change them in any way or use them commercially.",
      usageDescription:
        "You can download and share this work with others as long as you credit the creator, but you can't change it in any way or use it commercially.",
      allowsRemixing: false,
      allowsSharing: true,
      requiresAttribution: true,
      allowsCommercialUse: false,
      allowsStemSeparation: false,
      allowsStemSharing: false,
      requiresCredit: true,
      creditFormat:
        'Track "{title}" by {artist} is licensed under CC BY-NC-ND 4.0',
      usageRestrictions:
        "No commercial use, modifications, or derivative works permitted.",
      enabled: false,
    },

    // All Rights Reserved
    {
      name: "All Rights Reserved",
      type: LicenseType.ALL_RIGHTS_RESERVED,
      description:
        "Traditional copyright. All rights are reserved and protected.",
      usageDescription:
        "All rights are reserved by the creator. No use is permitted without explicit permission.",
      allowsRemixing: false,
      allowsSharing: false,
      requiresAttribution: true,
      allowsCommercialUse: false,
      allowsStemSeparation: false,
      allowsStemSharing: false,
      requiresCredit: true,
      usageRestrictions:
        "All rights reserved. No use permitted without explicit permission from the creator.",
      enabled: true,
    },

    // Custom - Stem Licensing
    {
      name: "Custom Stem License",
      type: LicenseType.CUSTOM,
      description:
        "Custom license for stem sharing with specific terms for commercial usage.",
      usageDescription:
        "Stems can be used with attribution. Commercial use requires explicit permission and may be subject to royalty payments.",
      allowsRemixing: true,
      allowsSharing: true,
      requiresAttribution: true,
      allowsCommercialUse: true,
      allowsStemSeparation: true,
      allowsStemSharing: true,
      requiresCredit: true,
      creditFormat: 'Contains stems from "{title}" by {artist}',
      customTerms:
        "Commercial use of stems requires explicit permission and may be subject to royalty payments.",
      royaltyTerms:
        "Commercial usage of stems requires a separate licensing agreement. Contact creator for details.",
      enabled: false,
    },
  ];

  console.log("Seeding licenses...");

  for (const license of licenses) {
    await prisma.license.upsert({
      where: { name: license.name },
      update: license,
      create: license,
    });
  }

  console.log("License seeding completed.");
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedLicenses()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
