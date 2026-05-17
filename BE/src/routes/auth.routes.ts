import { Router } from "express";
import AuthController from "../controller/auth.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Routes gọi thẳng method của class

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/google", AuthController.googleLogin);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

export default router;
