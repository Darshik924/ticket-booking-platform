import { Router } from "express";
import { register, login } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { getProfile } from "../controllers/authController";

const router = Router();

//register and login routes
router.post("/register", register);
/* Provide name, unique email and password and object of token, user(email, name, id) is returned */
router.post("/login", login);
/* Provide email and password and object of token,user (id, email, name) is returned  */

router.get("/me", authenticate, getProfile);
/* Send Auth token and object of user object is returned with id, name, email, createdAt */

export default router;
