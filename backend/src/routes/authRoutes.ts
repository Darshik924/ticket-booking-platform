import { Router } from "express";
import {
  register,
  login,
  getProfile,
} from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import passport from "passport";
import { success } from "zod";
import { register, login, getProfile } from "../controllers/authController";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = Router();

// Register new user
router.post("/register", register);

// Login user and return JWT token
router.post("/login", login);

// Get current logged-in user profile
router.get("/me", authenticateUser, getProfile);

//google login route
router.get("/google", passport.authenticate("google",{
  scope:["profile","email"],
})
);

//google callback
router.get("/google/callback",
  passport.authenticate("google",{
    session :false, 
  }),
  (req,res)=>{
    
      res.status(200).json(req.user);
  
  }
);

export default router;
export default router;
