import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma";
import { generateToken } from "../utils/generateToken";

const prisma = new PrismaClient();

export const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
      select: {
    id: true,
    name: true,
    email: true,
    createdAt: true,
  },

  });
};

export const loginUser = async (
    email :string,
    password:string
)=>{
    const user = await prisma.user.findUnique({
        where:{email},
    });

    if(!user){
        throw new Error("Invalid email or password");
    }
}