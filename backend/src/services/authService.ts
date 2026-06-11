// This file contains the authentication service functions for user registration and login. It interacts with the Prisma client to manage user data in the database, and uses bcrypt for password hashing and comparison. The service also generates JWT tokens for authenticated users.
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwtToken";
import { prisma } from "../lib/prisma";

// Function to register a new user
export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: { name, email, passwordHash },
  });
};

// Function to authenticate a user and generate a JWT token
export const loginUser = async (email: string, password: string) => {
  console.log("Email entered:", email);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken(user.id, user.email);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
};
