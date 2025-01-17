import { PrismaClient, Role } from ".prisma/client";
import { hashPassword } from "../auth";
import { program } from "commander";
import prompts, { PromptObject } from "prompts";

const prisma = new PrismaClient();

interface BootstrapOptions {
  username?: string;
  email?: string;
  password?: string;
}

async function promptForMissingOptions(options: BootstrapOptions) {
  const questions: PromptObject[] = [];

  if (!options.username) {
    questions.push({
      type: "text",
      name: "username",
      message: "Enter admin username:",
      validate: (value: string) =>
        value.length >= 3 || "Username must be at least 3 characters",
    });
  }

  if (!options.email) {
    questions.push({
      type: "text",
      name: "email",
      message: "Enter admin email:",
      validate: (value: string) =>
        value.includes("@") || "Please enter a valid email",
    });
  }

  if (!options.password) {
    questions.push({
      type: "password",
      name: "password",
      message: "Enter admin password:",
      validate: (value: string) =>
        value.length >= 8 || "Password must be at least 8 characters",
    });
  }

  const response = await prompts(questions);
  return {
    ...options,
    ...response,
  };
}

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

async function main() {
  program
    .name("bootstrap-db")
    .description(
      "Bootstrap the database with an admin user and required feature flags"
    )
    .option("-u, --username <username>", "Admin username (min 3 characters)")
    .option("-e, --email <email>", "Admin email")
    .option("-p, --password <password>", "Admin password (min 8 characters)")
    .helpOption("-h, --help", "Display help for command")
    .parse(process.argv);

  const options = program.opts();
  const finalOptions = await promptForMissingOptions(options);

  if (!finalOptions.username || !finalOptions.email || !finalOptions.password) {
    console.error("All options are required");
    program.outputHelp();
    process.exit(1);
  }

  await bootstrap(
    finalOptions.username,
    finalOptions.email,
    finalOptions.password
  );
}

main().catch((error) => {
  console.error("Failed to bootstrap database:", error);
  process.exit(1);
});
