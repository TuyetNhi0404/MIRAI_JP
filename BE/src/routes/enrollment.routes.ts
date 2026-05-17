import { Router } from "express";
import multer from "multer";
import {
  uploadCV,
  enrollCourse,
  getMyEnrollments,
  getAllEnrollments,
  approveEnrollment,
  rejectEnrollment,

} from "../controller/enrollment.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";
const router = Router();
const upload1 = multer({ dest: "uploads/" });

const storage = multer.memoryStorage();
export const upload2 = multer({ storage });

router.post("/upload-cv", upload1.single("file"), uploadCV);
router.post("/", upload2.single("file"), enrollCourse);
router.get("/my", getMyEnrollments);
router.use(verifyToken);
router.get("/", authorizeRoles("admin"), getAllEnrollments);
router.patch("/:id/approve", authorizeRoles("admin"), approveEnrollment);
router.patch("/:id/reject", authorizeRoles("admin"), rejectEnrollment);
export default router;
