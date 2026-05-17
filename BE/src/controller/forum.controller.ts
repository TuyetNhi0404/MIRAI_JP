import { Request, Response } from "express";
import { ForumPost } from "../model/forumPost.model";
import { ForumComment } from "../model/forumComment.model";
import { uploadImagesPostsToCloudinary, uploadImagesCommentToCloudinary, deleteFileFromCloudinary } from "../service/cloundinary.service";
import mongoose from "mongoose";
import { User } from "../model/user.model";
import NotificationService from "../service/notification.service";
import { ForumReply } from "../model/forumReply.model";
import { checkUserBanStatus, applyRejectPenalty, } from "../service/forumBan.service";
import { getBanInfo, unbanUserPermanent } from "../service/forumBan.service";
import { ForumBan } from "../model/forumBan.model";
// Tạo bài viết
export const createPostController = async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    const userId = new mongoose.Types.ObjectId(req.id);
    // Kiểm tra ban (cấm đăng bài / tương tác)
    const banStatus = await checkUserBanStatus(userId.toString());
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    let imageUrls: string[] = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const urls = await uploadImagesPostsToCloudinary(req.files);
      imageUrls = urls;
    }

    const post = await ForumPost.create({
      authorId: userId,
      title,
      content,
      images: imageUrls,
      status: "pending",
    });

    // ✅ NOTIFY ALL ADMINS ABOUT NEW PENDING POST
    try {
      const author = await User.findById(userId).select("name role");

      // Find all admin users
      const admins = await User.find({ role: "admin" }).select("_id");

      if (author && admins.length > 0) {
        // Send notification to each admin
        const notificationPromises = admins.map(admin =>
          NotificationService.notifyPendingPost({
            adminId: String(admin._id),
            postId: String(post._id),
            postTitle: post.title,
            authorName: author.name,
            authorId: userId.toString(),
          })
        );

        await Promise.all(notificationPromises);
      }
    } catch (notifErr) {
      console.error(" Error sending pending post notification to admins:", notifErr);
    }

    res.status(201).json({ message: "Post created successfully", post });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả bài viết (sắp xếp bài ghim lên trên)
export const getAllPostsController = async (req: Request, res: Response) => {
  try {
    const posts = await ForumPost.find({ status: "approved" })
      .populate("authorId", "name avatar role")
      .populate("pinnedBy", "name avatar role")
      .sort({ pinned: -1, pinnedAt: -1, createdAt: -1 });

    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Tìm kiếm bài viết với gợi ý
export const searchPostsController = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const page = Math.max(parseInt((req.query.page as any) || "1", 10), 1);
    const limit = Math.max(parseInt((req.query.limit as any) || "20", 10), 1);

    // Nếu query rỗng, trả về danh sách bài viết nổi bật
    if (!q || q.trim().length === 0) {
      const featuredPosts = await ForumPost.find({ status: "approved" })
        .populate("authorId", "name avatar role")
        .populate("pinnedBy", "name avatar role")
        .sort({ pinned: -1, pinnedAt: -1, createdAt: -1 })
        .limit(5);

      return res.json({
        data: featuredPosts,
        suggestions: [],
        pagination: { page, limit, total: 0 },
      });
    }

    const regex = new RegExp(q.trim(), "i");
    const filter = {
      status: "approved",
      $or: [{ title: regex }, { content: regex }],
    };

    // Lấy kết quả tìm kiếm chính
    const posts = await ForumPost.find(filter)
      .populate("authorId", "name avatar role")
      .populate("pinnedBy", "name avatar role")
      .sort({ pinned: -1, pinnedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Lấy gợi ý (tối đa 6 gợi ý khác nhau)
    const suggestionsData = await ForumPost.find(filter)
      .select("title _id likes")
      .sort({ createdAt: -1 })
      .limit(6);

    // Loại bỏ trùng lặp tiêu đề và sắp xếp theo likes
    const uniqueSuggestions = Array.from(
      new Map(suggestionsData.map((s) => [s.title, s])).values()
    )
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .map((s) => ({
        id: s._id,
        title: s.title,
      }))
      .slice(0, 6);

    const total = await ForumPost.countDocuments(filter);

    res.json({
      data: posts,
      suggestions: uniqueSuggestions,
      pagination: { page, limit, total },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Like bài viết
export const likePostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = (req as any).id;

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(String(userId));
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    const post = await ForumPost.findById(postId);
    if (!post)
      return res.status(404).json({ message: "No posts found" });

    // ✅ Check if user already liked (BEFORE modifying)
    const hadLiked = post.likes?.some((id: any) => id.toString() === userId.toString()) || false;

    // Nếu đã dislike → gỡ dislike
    post.dislikes = post.dislikes.filter(
      (id: any) => id.toString() !== userId.toString()
    );

    // Toggle like
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(
        (id: any) => id.toString() !== userId.toString()
      );
    } else {
      post.likes.push(userId);
    }

    await post.save();

    // ✅ SEND NOTIFICATION (only if NEW like added, not toggle off)
    if (!hadLiked && post.authorId.toString() !== userId.toString()) {
      try {
        const reactor = await User.findById(userId).select("name");
        const postAuthor = await User.findById(post.authorId).select("role");

        if (reactor && postAuthor) {
          await NotificationService.notifyPostReaction({
            recipientId: post.authorId.toString(),
            recipientRole: postAuthor.role,
            reactorName: reactor.name,
            reactionType: "like",
            postTitle: post.title,
            postId: postId!,
          });
        }
      } catch (notifErr) {
        console.error("Error sending post like notification:", notifErr);
      }
    }

    res.json({ message: "Like update successful", post });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Dislike bài viết
export const dislikePostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = (req as any).id;

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(String(userId));
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    const post = await ForumPost.findById(postId);
    if (!post)
      return res.status(404).json({ message: "No posts found" });

    // ✅ Check if user already disliked (BEFORE modifying)
    const hadDisliked = post.dislikes?.some((id: any) => id.toString() === userId.toString()) || false;

    // Nếu đã like → gỡ like
    post.likes = post.likes.filter(
      (id: any) => id.toString() !== userId.toString()
    );

    // Toggle dislike
    if (post.dislikes.includes(userId)) {
      post.dislikes = post.dislikes.filter(
        (id: any) => id.toString() !== userId.toString()
      );
    } else {
      post.dislikes.push(userId);
    }

    await post.save();

    // ✅ SEND NOTIFICATION (only if NEW dislike added, not toggle off)
    if (!hadDisliked && post.authorId.toString() !== userId.toString()) {
      try {
        const reactor = await User.findById(userId).select("name");
        const postAuthor = await User.findById(post.authorId).select("role");

        if (reactor && postAuthor) {
          await NotificationService.notifyPostReaction({
            recipientId: post.authorId.toString(),
            recipientRole: postAuthor.role,
            reactorName: reactor.name,
            reactionType: "dislike",
            postTitle: post.title,
            postId: postId!,
          });
        }
      } catch (notifErr) {
        console.error("Error sending post dislike notification:", notifErr);
      }
    }

    res.json({ message: "Dislike update successful", post });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Tạo bình luận
export const createCommentController = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.id);

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(userId.toString());
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    let imageUrls: string[] = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const urls = await uploadImagesCommentToCloudinary(req.files);
      imageUrls = urls;
    }

    const comment = await ForumComment.create({
      postId,
      authorId: userId,
      content,
      images: imageUrls,
    });

    try {
      if (!postId) {
        throw new Error("postId is missing from route parameters.");
      }
      const post = await ForumPost.findById(postId)
        .populate("authorId", "role name")
        .select("authorId title");
      const commenter = await User.findById(userId).select("name");

      if (post && commenter) {
        const author = post.authorId as unknown as {
          _id: mongoose.Types.ObjectId; role: "student" | "teacher" | "admin";
        };
        const authorIdStr = author._id.toString();
        const commenterIdStr = userId.toString();
        const postIdStr = postId.toString();
        // Do not notify when users comment on their own post
        if (authorIdStr !== commenterIdStr) {
          await NotificationService.notifyForumComment({
            recipientId: authorIdStr, // Post author
            recipientRole: author.role,
            postId: postIdStr, // Related forum post
            postTitle: post.title!, // Title of the forum post
            commenterId: commenterIdStr, // User who commented
            commenterName: commenter.name!, // Commenter's display name
          });
        }
      }
    } catch (notifErr) {
      console.error("Error sending forum comment notification:", notifErr);
    }

    res.status(201).json({ message: "Commented", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy comment của bài viết
export const getCommentsController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await ForumComment.find({ postId })
      .populate("authorId", "name avatar role")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// GHIM bài viết
export const pinPostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = (req as any).id;

    const post = await ForumPost.findById(postId);
    if (!post)
      return res.status(404).json({ message: "No posts found" });

    if (post.pinned) {
      return res.status(200).json({ message: "Pinned post", post });
    }

    post.pinned = true;
    post.pinnedBy = userId;
    post.pinnedAt = new Date();

    await post.save();
    res.json({ message: "Pinned post", post });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// BỎ GHIM bài viết
export const unpinPostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await ForumPost.findById(postId);
    if (!post)
      return res.status(404).json({ message: "No posts found" });

    if (!post.pinned) {
      return res.status(200).json({ message: "The post has not been pinned yet.", post });
    }

    post.pinned = false;
    post.pinnedBy = null;
    post.pinnedAt = null;

    await post.save();
    res.json({ message: "Unpinned post", post });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// approve post
export const approvePostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await ForumPost.findById(postId).populate("authorId", "role");
    if (!post)
      return res.status(404).json({ message: "No posts found" });

    post.status = "approved";
    post.rejectReason = "";

    await post.save();

    // ✅ NOTIFY POST AUTHOR ABOUT APPROVAL
    try {
      const author = post.authorId as any;
      await NotificationService.notifyPostResponse({
        authorId: author._id.toString(),
        authorRole: author.role,
        postTitle: post.title,
        status: "approved",
        postId: postId!,
      });
    } catch (notifErr) {
      console.error("Error sending post approval notification:", notifErr);
    }

    res.json({ message: "Post has been approved", post });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// reject post + BAN POLICY (dùng ForumBan service)
export const rejectPostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "No posts found" });
    }

    // tìm tác giả bài viết
    const authorId = post.authorId?.toString();
    if (!authorId) {
      return res.status(404).json({ message: "Author not found" });
    }

    // optional: đảm bảo user tồn tại
    const user = await User.findById(authorId);
    if (!user) {
      return res.status(404).json({ message: "Author not found" });
    }

    // 👉 Áp dụng penalty vào ForumBan collection
    const banResult = await applyRejectPenalty(authorId);

    // cập nhật bài viết
    post.status = "rejected";
    post.rejectReason = reason ?? "Inappropriate post";
    await post.save();

    // ✅ NOTIFY POST AUTHOR ABOUT REJECTION WITH BAN INFO
    try {
      await NotificationService.notifyPostResponse({
        authorId: (user._id as mongoose.Types.ObjectId).toString(),
        authorRole: user.role || "student",
        postTitle: post.title,
        status: "rejected",
        rejectReason: post.rejectReason,
        banInfo: banResult,
        postId: postId!,
      });
    } catch (notifErr) {
      console.error("Error sending post rejection notification:", notifErr);
    }

    return res.json({
      message: "Post rejected",
      post,
      userBan: banResult,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả bài viết pending
export const getPendingPostsController = async (req: Request, res: Response) => {
  try {
    const posts = await ForumPost.find({ status: "pending" })
      .populate("authorId", "name avatar role")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Xóa bài viết
export const deletePostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = (req as any).id;

    const post = await ForumPost.findById(postId);
    if (!post)
      return res.status(404).json({ message: "No posts found" });

    const user = await User.findById(userId);

    if (post.authorId.toString() !== userId && user?.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this post." });
    }

    // XÓA FILE ẢNH CỦA POST
    if (post.images?.length) {
      for (const img of post.images) {
        await deleteFileFromCloudinary(img);
      }
    }

    // TÌM TOÀN BỘ COMMENT
    const comments = await ForumComment.find({ postId });

    for (const cmt of comments) {
      // XÓA FILE ẢNH COMMENT
      if (cmt.images?.length) {
        for (const img of cmt.images) {
          await deleteFileFromCloudinary(img);
        }
      }

      // TÌM TOÀN BỘ REPLY CỦA COMMENT
      const replies = await ForumReply.find({ commentId: cmt._id });

      for (const rep of replies) {
        if (rep.images?.length) {
          for (const img of rep.images) {
            await deleteFileFromCloudinary(img);
          }
        }
        await ForumReply.findByIdAndDelete(rep._id);
      }

      await ForumComment.findByIdAndDelete(cmt._id);
    }

    // XOÁ POST
    await ForumPost.findByIdAndDelete(postId);

    return res.json({ message: "Deleted post along with all comments, replies and related files" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Xóa comment
export const deleteCommentController = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).id;

    const comment = await ForumComment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "No comments found" });

    const user = await User.findById(userId);

    if (comment.authorId.toString() !== userId && user?.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this comment" });
    }

    // XÓA FILE COMMENT
    if (comment.images?.length) {
      for (const img of comment.images) {
        await deleteFileFromCloudinary(img);
      }
    }

    // XOÁ REPLY + FILES
    const replies = await ForumReply.find({ commentId });

    for (const rep of replies) {
      if (rep.images?.length) {
        for (const img of rep.images) {
          await deleteFileFromCloudinary(img);
        }
      }
      await ForumReply.findByIdAndDelete(rep._id);
    }

    // XOÁ COMMENT
    await ForumComment.findByIdAndDelete(commentId);

    res.json({ message: "Deleted comment and all replies and related files" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Sửa bài viết
export const updatePostController = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, deleteImages } = req.body;

    const existingPost = await ForumPost.findById(postId);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    let currentImages: string[] = Array.isArray(existingPost.images)
      ? existingPost.images : existingPost.images
        ? [existingPost.images] : [];

    //deleteImages
    if (deleteImages) {
      let deleteList: string[] = [];

      if (typeof deleteImages === "string") {
        try {
          deleteList = JSON.parse(deleteImages);
        } catch {
          deleteList = deleteImages.split(",").map(s => s.trim());
        }
      } else if (Array.isArray(deleteImages)) {
        deleteList = deleteImages;
      }

      for (const url of deleteList) {
        await deleteFileFromCloudinary(url);
        currentImages = currentImages.filter(f => f !== url);
      }
    }

    //upload new files
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      const newUrls = await uploadImagesPostsToCloudinary(files);
      currentImages = [...currentImages, ...newUrls];
    }

    if (content !== undefined) existingPost.content = content;
    existingPost.images = currentImages;

    await existingPost.save();

    return res.status(200).json({
      message: "Post updated successfully",
      data: existingPost,
    });
  } catch (err: any) {
    console.error("Update error post:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Sửa comment
export const updateCommentController = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content, deleteImages } = req.body;

    const existingComment = await ForumComment.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({ message: "No comments found" });
    }

    let currentImages: string[] = Array.isArray(existingComment.images)
      ? existingComment.images
      : existingComment.images
        ? [existingComment.images]
        : [];

    //deleteImages
    if (deleteImages) {
      let deleteList: string[] = [];

      if (typeof deleteImages === "string") {
        try {
          deleteList = JSON.parse(deleteImages);
        } catch {
          deleteList = deleteImages.split(",").map(s => s.trim());
        }
      } else if (Array.isArray(deleteImages)) {
        deleteList = deleteImages;
      }

      for (const url of deleteList) {
        await deleteFileFromCloudinary(url);
        currentImages = currentImages.filter(f => f !== url);
      }
    }

    // UPLOAD NEW IMAGES
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      const newUrls = await uploadImagesCommentToCloudinary(files);
      currentImages = [...currentImages, ...newUrls];
    }

    if (content !== undefined) existingComment.content = content;
    existingComment.images = currentImages;

    await existingComment.save();

    return res.status(200).json({
      message: "Comment updated successfully",
      data: existingComment,
    });
  } catch (err: any) {
    console.error("Update error comment:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Like comment
export const likeCommentController = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).id;

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(String(userId));
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    const comment = await ForumComment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "No comments found" });

    // ✅ Check if user already liked (BEFORE modifying)
    const hadLiked = comment.likes?.some((id: any) => id.toString() === userId.toString()) || false;

    // Nếu đã dislike → gỡ dislike
    comment.dislikes = comment.dislikes?.filter(
      (id: any) => id.toString() !== userId.toString()
    );

    // Toggle like
    if (comment.likes?.includes(userId)) {
      comment.likes = comment.likes.filter(
        (id: any) => id.toString() !== userId.toString()
      );
    } else {
      comment.likes?.push(userId);
    }

    await comment.save();

    // ✅ SEND NOTIFICATION (only if NEW like added, not toggle off)
    if (!hadLiked && comment.authorId.toString() !== userId.toString()) {
      try {
        const post = await ForumPost.findById(comment.postId).select("title");
        const reactor = await User.findById(userId).select("name");
        const commentAuthor = await User.findById(comment.authorId).select("role");

        if (post && reactor && commentAuthor) {
          await NotificationService.notifyCommentReaction({
            recipientId: comment.authorId.toString(),
            recipientRole: commentAuthor.role,
            reactorName: reactor.name,
            reactionType: "like",
            postTitle: post.title,
            commentId: commentId!,
          });
        }
      } catch (notifErr) {
        console.error("Error sending comment reaction notification:", notifErr);
      }
    }

    res.json({ message: "Like update successful", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Dislike comment
export const dislikeCommentController = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).id;

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(String(userId));
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    const comment = await ForumComment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "No comments found" });

    // ✅ Check if user already disliked (BEFORE modifying)
    const hadDisliked = comment.dislikes?.some((id: any) => id.toString() === userId.toString()) || false;

    comment.likes = comment.likes?.filter(
      (id: any) => id.toString() !== userId.toString()
    );

    if (comment.dislikes?.includes(userId)) {
      comment.dislikes = comment.dislikes.filter(
        (id: any) => id.toString() !== userId.toString()
      );
    } else {
      comment.dislikes?.push(userId);
    }

    await comment.save();

    // ✅ SEND NOTIFICATION (only if NEW dislike added, not toggle off)
    if (!hadDisliked && comment.authorId.toString() !== userId.toString()) {
      try {
        const post = await ForumPost.findById(comment.postId).select("title");
        const reactor = await User.findById(userId).select("name");
        const commentAuthor = await User.findById(comment.authorId).select("role");

        if (post && reactor && commentAuthor) {
          await NotificationService.notifyCommentReaction({
            recipientId: comment.authorId.toString(),
            recipientRole: commentAuthor.role,
            reactorName: reactor.name,
            reactionType: "dislike",
            postTitle: post.title,
            commentId: commentId!,
          });
        }
      } catch (notifErr) {
        console.error("Error sending comment reaction notification:", notifErr);
      }
    }

    res.json({ message: "Dislike update successful", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Reply comment
export const createReplyController = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const { commentId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.id);

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(userId.toString());
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    let imageUrls: string[] = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      imageUrls = await uploadImagesCommentToCloudinary(req.files);
    }

    const reply = await ForumReply.create({
      commentId,
      authorId: userId,
      content,
      images: imageUrls,
    });

    // 🔔 SEND NOTIFICATION — notify comment author if someone replies
    try {
      const parentComment = await ForumComment.findById(commentId)
        .select("authorId postId");

      if (parentComment) {
        const commentAuthorId = parentComment.authorId.toString();

        // Don't notify yourself
        if (commentAuthorId !== userId.toString()) {

          const reactor = await User.findById(userId).select("name");
          const commentAuthor = await User.findById(commentAuthorId).select("role");
          const post = await ForumPost.findById(parentComment.postId).select("title");

          if (reactor && commentAuthor && post) {
            await NotificationService.notifyReplyToComment({
              recipientId: commentAuthorId,
              recipientRole: commentAuthor.role,
              reactorName: reactor.name,
              postTitle: post.title,
              commentId: commentId!,
              replyId: (reply._id as mongoose.Types.ObjectId).toString(),
              postId: parentComment.postId.toString(),
            });
          }
        }
      }
    } catch (notifErr) {
      console.error("Error sending reply notification:", notifErr);
    }

    res.status(201).json({ message: "Comment replied", reply });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// get all reply
export const getRepliesController = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const replies = await ForumReply.find({ commentId })
      .populate("authorId", "name avatar role")
      .sort({ createdAt: -1 });

    res.json(replies);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// like reply
export const likeReplyController = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const userId = req.id;

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(String(userId));
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    const reply = await ForumReply.findById(replyId);
    if (!reply)
      return res.status(404).json({ message: "No reply found" });

    // Check if user already liked (BEFORE modifying)
    const hadLiked = reply.likes?.some((id: any) => id.toString() === userId) || false;

    reply.dislikes = reply.dislikes?.filter((id) => id.toString() !== userId);

    if (reply.likes?.includes(userId as any)) {
      reply.likes = reply.likes.filter((id) => id.toString() !== userId);
    } else {
      reply.likes?.push(new mongoose.Types.ObjectId(userId));
    }

    await reply.save();

    // ✅ SEND NOTIFICATION (only if NEW like added, not toggle off)
    if (!hadLiked && reply.authorId.toString() !== userId) {
      try {
        // Get the comment this reply belongs to
        const comment = await ForumComment.findById(reply.commentId).select("postId");
        if (comment) {
          const post = await ForumPost.findById(comment.postId).select("title");
          const reactor = await User.findById(userId).select("name");
          const replyAuthor = await User.findById(reply.authorId).select("role");

          if (post && reactor && replyAuthor) {
            await NotificationService.notifyCommentReaction({
              recipientId: reply.authorId.toString(),
              recipientRole: replyAuthor.role,
              reactorName: reactor.name,
              reactionType: "like",
              postTitle: post.title,
              commentId: replyId!, // Using replyId as the relatedEntityId
            });
          }
        }
      } catch (notifErr) {
        console.error("Error sending reply reaction notification:", notifErr);
      }
    }

    res.json({ message: "Like reply successful", reply });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// dislike reply
export const dislikeReplyController = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const userId = req.id;

    // Kiểm tra ban
    const banStatus = await checkUserBanStatus(String(userId));
    if (banStatus.isBanned) {
      return res.status(403).json({ message: banStatus.reason });
    }

    const reply = await ForumReply.findById(replyId);
    if (!reply)
      return res.status(404).json({ message: "No reply found" });

    // Check if user already disliked (BEFORE modifying)
    const hadDisliked = reply.dislikes?.some((id: any) => id.toString() === userId) || false;

    reply.likes = reply.likes?.filter((id) => id.toString() !== userId);

    if (reply.dislikes?.includes(userId as any)) {
      reply.dislikes = reply.dislikes.filter((id) => id.toString() !== userId);
    } else {
      reply.dislikes?.push(new mongoose.Types.ObjectId(userId));
    }

    await reply.save();

    // ✅ SEND NOTIFICATION (only if NEW dislike added, not toggle off)
    if (!hadDisliked && reply.authorId.toString() !== userId) {
      try {
        // Get the comment this reply belongs to
        const comment = await ForumComment.findById(reply.commentId).select("postId");
        if (comment) {
          const post = await ForumPost.findById(comment.postId).select("title");
          const reactor = await User.findById(userId).select("name");
          const replyAuthor = await User.findById(reply.authorId).select("role");

          if (post && reactor && replyAuthor) {
            await NotificationService.notifyCommentReaction({
              recipientId: reply.authorId.toString(),
              recipientRole: replyAuthor.role,
              reactorName: reactor.name,
              reactionType: "dislike",
              postTitle: post.title,
              commentId: replyId!, // Using replyId as the relatedEntityId
            });
          }
        }
      } catch (notifErr) {
        console.error("Error sending reply reaction notification:", notifErr);
      }
    }

    res.json({ message: "Dislike reply successful", reply });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// update reply
export const updateReplyController = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const { content, deleteImages } = req.body;

    const existingReply = await ForumReply.findById(replyId);
    if (!existingReply) {
      return res.status(404).json({ message: "No reply found" });
    }

    let currentImages: string[] = Array.isArray(existingReply.images)
      ? existingReply.images
      : existingReply.images
        ? [existingReply.images]
        : [];

    // HANDLE deleteImages
    if (deleteImages) {
      let deleteList: string[] = [];

      if (typeof deleteImages === "string") {
        try {
          deleteList = JSON.parse(deleteImages);
        } catch {
          deleteList = deleteImages.split(",").map(s => s.trim());
        }
      } else if (Array.isArray(deleteImages)) {
        deleteList = deleteImages;
      }

      for (const url of deleteList) {
        await deleteFileFromCloudinary(url);
        currentImages = currentImages.filter(f => f !== url);
      }
    }

    // UPLOAD NEW IMAGES
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      const newUrls = await uploadImagesCommentToCloudinary(files);
      currentImages = [...currentImages, ...newUrls];
    }

    if (content !== undefined) existingReply.content = content;
    existingReply.images = currentImages;

    await existingReply.save();

    return res.status(200).json({
      message: "Reply updated successfully",
      data: existingReply,
    });
  } catch (err: any) {
    console.error("Update error reply:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// delete reply
export const deleteReplyController = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const userId = (req as any).id;

    const reply = await ForumReply.findById(replyId);
    if (!reply)
      return res.status(404).json({ message: "No reply found" });

    const user = await User.findById(userId);

    if (reply.authorId.toString() !== userId && user?.role !== "admin") {

      return res.status(403).json({ message: "You do not have permission to delete" });
    }

    // XÓA FILE ẢNH CỦA REPLY
    if (reply.images?.length) {
      for (const img of reply.images) {
        await deleteFileFromCloudinary(img);
      }
    }

    await ForumReply.findByIdAndDelete(replyId);

    res.json({ message: "Deleted reply and all related files" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const unbanForumUserController = async (
  req: Request<{ userId: string }>,
  res: Response
) => {
  try {
    const { userId } = req.params;

    const fb = await unbanUserPermanent(userId);
    if (!fb) {
      return res
        .status(404)
        .json({ message: "No ban information found for this user" });
    }

    return res.json({
      message: "User ban removed on forum",
      forumBan: fb,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
export const getForumBanInfoController = async (
  req: Request<{ userId: string }>,
  res: Response
) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const banInfo = await getBanInfo(userId);

    return res.json({
      message: "Get information successfully",
      banInfo,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
export const getBannedUsersController = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const limit = Math.max(parseInt((req.query.limit as string) || "20", 10), 1);
    const q = (req.query.q as string) || "";

    // Lọc theo trạng thái bị ban
    const match: any = { blocked: true };

    // Nếu có search theo tên / email
    if (q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      const users = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select("_id");

      const userIds = users.map((u) => u._id);
      // Không có user nào match -> trả list rỗng luôn
      if (userIds.length === 0) {
        return res.json({
          data: [],
          pagination: { page, limit, total: 0 },
        });
      }

      match.userId = { $in: userIds };
    }

    const query = ForumBan.find(match)
      .populate("userId", "name email role avatar status")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const [items, total] = await Promise.all([
      query,
      ForumBan.countDocuments(match),
    ]);

    return res.json({
      data: items,
      pagination: { page, limit, total },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
