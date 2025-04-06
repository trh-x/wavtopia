import "dotenv/config";
import { exec } from "child_process";
import { promisify } from "util";
import { minioSetupConfig } from "./config";

const execAsync = promisify(exec);

async function waitForMinIO(timeoutMs = 30000): Promise<void> {
  const startTime = Date.now();
  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("Timeout waiting for MinIO to be ready");
    }
    try {
      await runMinIOCommand("mc alias ls local");
      return;
    } catch (err) {
      console.log("Waiting for MinIO to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function runMinIOCommand(command: string): Promise<void> {
  const { stdout, stderr } = await execAsync(
    `docker compose exec -T minio ${command}`
  );
  if (stderr) {
    throw new Error(stderr);
  }
}

async function setupMinIO() {
  // Configure mc with root credentials first
  await runMinIOCommand(
    `mc alias set local http://localhost:9000 "${minioSetupConfig.rootUser}" "${minioSetupConfig.rootPassword}"`
  );

  // Wait for MinIO to be ready
  await waitForMinIO();

  try {
    // Create regular user for application use
    console.log(`Creating MinIO user '${minioSetupConfig.user}'...`);
    try {
      await runMinIOCommand(
        `mc admin user add local ${minioSetupConfig.user} ${minioSetupConfig.password}`
      );
      console.log(`✅ Created MinIO user '${minioSetupConfig.user}'`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        console.log(`⚠️  User '${minioSetupConfig.user}' already exists`);
      } else {
        throw err;
      }
    }

    // Create bucket if it doesn't exist
    console.log(`Creating bucket '${minioSetupConfig.bucket}'...`);
    try {
      await runMinIOCommand(`mc ls local/${minioSetupConfig.bucket}`);
      console.log(`⚠️  Bucket '${minioSetupConfig.bucket}' already exists`);
    } catch {
      await runMinIOCommand(`mc mb local/${minioSetupConfig.bucket}`);
      console.log(`✅ Created bucket '${minioSetupConfig.bucket}'`);
    }

    // Assign readwrite policy to user
    console.log(
      `Assigning readwrite policy to user '${minioSetupConfig.user}'...`
    );
    try {
      await runMinIOCommand(
        `mc admin policy attach local readwrite --user=${minioSetupConfig.user}`
      );
      console.log(
        `✅ Assigned readwrite policy to user '${minioSetupConfig.user}'`
      );
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("policy already attached")
      ) {
        console.log(
          `⚠️  Policy 'readwrite' already attached to user '${minioSetupConfig.user}'`
        );
      } else {
        console.error("❌ Failed to assign policy to user:", err);
        process.exit(1);
      }
    }

    console.log("\n✅ MinIO setup completed successfully");
    console.log("Application should now use these credentials:");
    console.log(`Access Key: ${minioSetupConfig.user}`);
    console.log(`Secret Key: ${minioSetupConfig.password}`);
  } catch (err) {
    console.error("Error setting up MinIO:", err);
    process.exit(1);
  }
}

setupMinIO().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
