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
    data: { name, email, passwordHash, role: "CUSTOMER" },
  });
};

// Function to authenticate a user and generate a JWT token
export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }


if (!user.passwordHash) {
  throw new Error("This account uses Google Sign-In");
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

//login using the googleAuth
export const googleLogin = async (
  googleId: string,
  email: string,
  name: string,
  avatar?: string
) => {
  // Check if user already exists with this Google account
  const existingGoogleUser = await prisma.user.findUnique({
    where: {
      googleId,
    },
  });

  if (existingGoogleUser) {
    const token = generateToken(
      existingGoogleUser.id,
      existingGoogleUser.email
    );

    return {
      token,
      user: {
        id: existingGoogleUser.id,
        name: existingGoogleUser.name,
        email: existingGoogleUser.email,
      },
    };
  }

  // Check if user exists with same email
  let existWithEmail = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existWithEmail) {
    existWithEmail = await prisma.user.update({
      where: {
        id: existWithEmail.id,
      },
      data: {
        googleId,
        avatar,
      },
    });

    const token = generateToken(
      existWithEmail.id,
      existWithEmail.email
    );

    return {
      token,
      user: {
        id: existWithEmail.id,
        name: existWithEmail.name,
        email: existWithEmail.email,
      },
    };
  }

  // Create new Google user
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      googleId,
      avatar,
    },
  });

  const token = generateToken(
    newUser.id,
    newUser.email
  );

  return {
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    },
  };
};