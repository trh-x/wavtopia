import { PrismaClient, Role } from ".prisma/client";
import { hashPassword } from "../auth";
import { program } from "commander";

const prisma = new PrismaClient();

async function bootstrap(username: string, email: string, password: string) {
  try {
    // Create admin user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log("Created admin user:", {
      id: user.id,
      username: user.username,
      email: user.email,
    });

    // Create and enable EARLY_ACCESS_REQUIRED feature flag
    const flag = await prisma.featureFlag.create({
      data: {
        name: "EARLY_ACCESS_REQUIRED",
        description: "Requires users to have an invite code to register",
        isEnabled: true,
      },
    });
    console.log("Created and enabled feature flag:", flag.name);

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error bootstrapping database:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

program
  .requiredOption("-u, --username <username>", "Admin username")
  .requiredOption("-e, --email <email>", "Admin email")
  .requiredOption("-p, --password <password>", "Admin password")
  .parse(process.argv);

const options = program.opts();
bootstrap(options.username, options.email, options.password);
