import { prisma } from "../src/lib/prisma";
import jwt from "jsonwebtoken";
import fs from "fs";

// IMPORTANT: This must exactly match the JWT_SECRET in your .env file
const JWT_SECRET: string =
  process.env.JWT_SECRET || "ticket_booking_dev_secret";

async function generateUsers(): Promise<void> {

  // Define the type for the data we are pushing
  const usersToInsert: { name: string; email: string; passwordHash: string }[] =
    [];
  const batchId = `flashsale_${Date.now()}`;

  // We use a dummy hash since k6 won't actually hit the /login endpoint anyway.
  // It just uses the pre-generated JWTs.
  const dummyPasswordHash = "12345";

  for (let i = 0; i < 10000; i++) {
    usersToInsert.push({
      name: `K6_User_${i}`,
      email: `${batchId}_${i}@test.com`,
      passwordHash: dummyPasswordHash,
    });
  }

  await prisma.user.createMany({
    data: usersToInsert,
    skipDuplicates: true,
  });

  // Fixed: Added email to the select statement so it can be used in the JWT
  const insertedUsers = await prisma.user.findMany({
    where: { email: { startsWith: batchId } },
    select: { id: true, email: true },
  });

  // Function to generate a JWT token for a user with proper typing
  const generateToken = (userId: number, email: string): string => {
    return jwt.sign(
      {
        userId,
        email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d", // Note: Usually lowercase 'd' for jsonwebtoken
      },
    );
  };


  const outputData = insertedUsers.map((user) => {
    const token = generateToken(user.id, user.email);
    return { token };
  });

  fs.writeFileSync("users.json", JSON.stringify(outputData, null, 2));

}

generateUsers()
  .catch((e: unknown) => {
    console.error("❌ Error generating users:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
