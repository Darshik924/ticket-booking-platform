import { prisma } from "../src/lib/prisma";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// IMPORTANT: This must exactly match the JWT_SECRET in your .env file
const JWT_SECRET: string =
  process.env.JWT_SECRET || "ticket_booking_dev_secret";

async function generateUsers(): Promise<void> {

  const usersToInsert: { name: string; email: string; passwordHash: string }[] =
    [];
  const batchId = `flashsale_${Date.now()}`;

  // We use a dummy hash since k6 won't actually hit the /login endpoint anyway.
  const dummyPasswordHash = "12345";

  for (let i = 0; i < 3000; i++) {
    usersToInsert.push({
      name: `K6_UserSS_${i}`,
      email: `${batchId}SS_${i}@test.com`,
      passwordHash: dummyPasswordHash,
    });
  }

  const result = await prisma.user.createMany({
    data: usersToInsert,
    skipDuplicates: true,
  });

  const insertedUsers = await prisma.user.findMany({
    where: { email: { startsWith: batchId } },
    select: { id: true, email: true },
  });
  console.log(`Found ${insertedUsers.length} matching user records.`);

  const generateToken = (userId: number, email: string): string => {
    return jwt.sign(
      {
        userId,
        email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
  };

  const outputData = insertedUsers.map((user) => ({
    token: generateToken(user.id, user.email),
  }));

  const outputPath = path.join(import.meta.dirname, "users.json");
  console.log(`📝 Writing tokens to: ${outputPath}`);

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log(
    `🎉 SUCCESS! Created ${outputData.length} users and saved tokens to loadtests/users.json`,
  );
}

generateUsers()
  .catch((e: unknown) => {
    console.error("❌ Fatal error generating users:", e);
  })
  .finally(async () => {
    console.log("🔌 Disconnecting Prisma...");
    await prisma.$disconnect();
  });
