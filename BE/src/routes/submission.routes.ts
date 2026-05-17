import express from "express";
import multer from "multer";
import { submitAssignment, getMySubmission, gradeSubmission, getSubmissionsInCourseController, getAllSubmissionsOfAssignment, updateSubmission } from "../controller/submission.controller";
import { authorizeRoles, verifyToken } from "../middleware/auth.middleware";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(verifyToken);


// Student submit
router.post("/:assignmentId/submit", verifyToken, authorizeRoles("student"),upload.array("files"), submitAssignment);
// Student view submission
router.get("/:assignmentId/my-submission", authorizeRoles("student"), getMySubmission);
// Teacher grade
router.put("/:submissionId/grade", verifyToken, authorizeRoles("teacher"), upload.none(), gradeSubmission);
//Get tất cả submission của 1 khóa học, 1 sinh viên cụ thể, lọc theo status
router.get("/courses/:courseId/submissions", getSubmissionsInCourseController);
//lấy tất cả submission trong 1 assignment
router.get("/assignment/:assignmentId", verifyToken, getAllSubmissionsOfAssignment);
//Update submission
router.put("/update/:submissionId", verifyToken, authorizeRoles("student"), upload.array("files"), updateSubmission);
export default router;
