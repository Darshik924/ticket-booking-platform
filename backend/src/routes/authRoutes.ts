import { Router } from "express";
import { register, login } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { getProfile } from "../controllers/authController";


const router = Router();

//register and login routes
router.post("/register", register);

router.post("/login", login);

router.get("/me", authenticate, getProfile);

export default router;