import { Router } from "express";
import {
  enrollCourse,
  getMyEnrollments,
  getAllEnrollments,
  approveEnrollment,
  rejectEnrollment,
} from "../controller/enrollment.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.post("/", enrollCourse);
router.get("/my", getMyEnrollments);
router.use(verifyToken);
router.get("/", authorizeRoles("admin"), getAllEnrollments);
router.patch("/:id/approve", authorizeRoles("admin"), approveEnrollment);
router.patch("/:id/reject", authorizeRoles("admin"), rejectEnrollment);

export default router;
