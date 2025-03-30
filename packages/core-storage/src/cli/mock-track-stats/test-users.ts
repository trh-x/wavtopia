import { PrismaClient } from ".prisma/client";

const prisma = new PrismaClient();

// Test users for generating activity
export const TEST_USERS = [
  { username: "alice", email: "alice@test.com" },
  { username: "bob", email: "bob@test.com" },
  { username: "charlie", email: "charlie@test.com" },
  { username: "diana", email: "diana@test.com" },
] as const;

// Ensure test users exist
export async function ensureTestUsers() {
  console.log("Ensuring test users exist...");
  for (const user of TEST_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        password: "test123", // This is just for test data
      },
    });
  }
}

// Get all test users from database
export async function getTestUsers() {
  return prisma.user.findMany({
    where: {
      email: {
        in: TEST_USERS.map((u) => u.email),
      },
    },
  });
}
