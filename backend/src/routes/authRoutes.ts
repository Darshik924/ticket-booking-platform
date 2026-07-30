import { Router } from "express";
import { register, login, getProfile } from "../controllers/authController.js";
import passport from "passport";
import { success } from "zod";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = Router();

// Register new user
router.post("/register", register);

// Login user and return JWT token
router.post("/login", login);

// Get current logged-in user profile
router.get("/me", authenticateUser, getProfile);

//google login route
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

//google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
  }),
  (req, res) => {
    const { token, user } = req.user as any;

    const encodedUser = encodeURIComponent(JSON.stringify(user));

    res.redirect(
      `http://localhost:3000/auth/callback?token=${token}&user=${encodedUser}`,
    );
  },
);

export default router;
