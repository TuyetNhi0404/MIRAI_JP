import { Router } from "express";
import { 
  createAssignmentController, 
  getAssignmentsByCourseController,
  getAllAssignmentsController,
  updateAssignmentController, 
  deleteAssignmentController,
  getActiveAssignmentsController,
  upload 
} from "../controller/assignment.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
router.use(verifyToken);

// Tạo assignment (teacher only)
router.post("/upload", authorizeRoles("teacher"), upload.array("files", 10), createAssignmentController);

// Lấy TẤT CẢ assignments (KHÔNG cần courseId)
router.get("/all", authorizeRoles("teacher", "student", "admin"), getAllAssignmentsController);

// Lấy tất cả assignments trong 1 course
router.get("/get/:courseId", authorizeRoles("teacher", "student", "admin"), getAssignmentsByCourseController);

// Lấy 1 assignment cụ thể
router.get("/get/:courseId/:idOrTitle", authorizeRoles("teacher", "student"), getAssignmentsByCourseController);

// Xóa assignment (teacher only)
router.delete("/delete/:courseId/:idOrTitle", authorizeRoles("teacher"), deleteAssignmentController);

// Cập nhật assignment (teacher only)
router.put("/update/:courseId/:idOrTitle", authorizeRoles("teacher"), upload.array("files"), updateAssignmentController);

// Student xem assignment đang active trong một khóa học
router.get("/active/:courseId", authorizeRoles("student","teacher","admin"), getActiveAssignmentsController);

export default router;