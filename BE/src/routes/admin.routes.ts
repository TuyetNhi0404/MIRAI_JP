import { Router } from "express";
import AdminController from "../controller/admin.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
import { UserRole } from "../enum/user.enum";

const router = Router();

// Routes gọi thẳng method của class
router.use(verifyToken, authorizeRoles(UserRole.ADMIN));
router.get("/users", AdminController.getAll);
router.post("/lock/:id", AdminController.lockUser);
router.post("/unlock/:id", AdminController.unlockUser);
router.post("/create-user", AdminController.createUser);
router.get("/users/last-login", AdminController.getUserLastLogin);
router.get("/teachers", AdminController.getTeachers);
export default router;
