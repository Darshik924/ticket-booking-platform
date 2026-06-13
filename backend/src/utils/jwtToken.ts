// This file contains a utility function to generate JWT tokens for authenticated users. It uses the jsonwebtoken library to create a token that includes the user's ID and email, and sets an expiration time of 7 days. The secret key for signing the token is retrieved from environment variables.
import jwt from "jsonwebtoken";

interface jwtPayload {
  userId: number;
  email: string;
}
const SECRET = process.env.JWT_SECRET!;

// Function to generate a JWT token for a user
const generateToken = (userId: number, email: string) => {
  return jwt.sign(
    {
      userId,
      email,
    },
    SECRET as string,
    {
      expiresIn: "7D",
    },
  );
};

const verifyToken = (token: string): jwtPayload => {
  return jwt.verify(token, SECRET) as jwtPayload;
};

export { generateToken, verifyToken };
