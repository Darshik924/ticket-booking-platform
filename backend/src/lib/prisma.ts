import { Prisma, PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("ERROR: DATABASE_URL is not defined in your environment variables!");
}

// Create a native pg pool connection 
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Pass it directly to the constructor to satisfy Prisma 7's requirement
export const prisma = new PrismaClient({ adapter });
