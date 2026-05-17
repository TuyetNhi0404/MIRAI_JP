import { Router } from "express";
import multer from "multer";
import {
  createPostController,
  getAllPostsController,
  searchPostsController,
  createCommentController,
  getCommentsController,
  likePostController,
  dislikePostController,
  pinPostController,
  unpinPostController,
  approvePostController,
  rejectPostController,
  getPendingPostsController,
  deletePostController,
  updatePostController,
  deleteCommentController,
  updateCommentController,
  likeCommentController,
  dislikeCommentController,
  createReplyController,
  getRepliesController,
  likeReplyController,
  dislikeReplyController,
  deleteReplyController,
  updateReplyController,
  getForumBanInfoController,
  unbanForumUserController,
  getBannedUsersController,
} from "../controller/forum.controller";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// public forum routes (yêu cầu đăng nhập)
router.get("/", verifyToken, getAllPostsController);
// search posts
router.get("/search", verifyToken, searchPostsController);
router.post("/", verifyToken, upload.array("images"), createPostController);

// like / dislike
router.post("/like/:postId", verifyToken, likePostController);
router.post("/dislike/:postId", verifyToken, dislikePostController);

// comment
router.post("/comment/:postId", verifyToken, upload.array("images"), createCommentController);
router.get("/comment/:postId", verifyToken, getCommentsController);

// pin/unpin (chỉ teacher + admin)
router.post("/pin/:postId", verifyToken, authorizeRoles("teacher", "admin"), pinPostController);
router.post("/unpin/:postId", verifyToken, authorizeRoles("teacher", "admin"), unpinPostController);

//approve và reject post
router.post("/approve/:postId", verifyToken, authorizeRoles("admin"), approvePostController);
router.post("/reject/:postId", verifyToken, authorizeRoles("admin"), rejectPostController);
router.get("/pending-posts", verifyToken, authorizeRoles("admin"), getPendingPostsController);
//delete and update post
router.delete("/post/:postId/delete", verifyToken, deletePostController);
router.put("/post/:postId/update", verifyToken, upload.array("images"), updatePostController);

//delete and update comment 
router.delete("/comment/:commentId/delete", verifyToken, deleteCommentController);
router.put("/comment/:commentId/update", verifyToken,upload.array("images", 4), updateCommentController);

// like / dislike comment
router.post("/comment/:commentId/like", verifyToken, likeCommentController);

router.post("/comment/:commentId/dislike", verifyToken, dislikeCommentController);

// reply comment
router.post(
  "/comment/:commentId/reply",
  verifyToken,
  upload.array("images"),
  createReplyController
);
// get all reply
router.get("/comment/:commentId/replies", verifyToken, getRepliesController);

// like / dislike reply
router.post("/reply/:replyId/like", verifyToken, likeReplyController);
router.post("/reply/:replyId/dislike", verifyToken, dislikeReplyController);

// delete / update reply
router.delete(
  "/reply/:replyId/delete",
  verifyToken,
  deleteReplyController
);
router.put(
  "/reply/:replyId/update",
  verifyToken,
  upload.array("images", 4),
  updateReplyController
);
// admin unban forum user
router.get("/admin/user-ban/:userId", verifyToken,authorizeRoles("admin"),getForumBanInfoController);
router.post("/admin/unban/:userId",verifyToken,authorizeRoles("admin"),unbanForumUserController);
router.get("/admin/banned-users", verifyToken, authorizeRoles("admin"), getBannedUsersController);
export default router;
