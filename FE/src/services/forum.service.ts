import { AxiosError } from "axios";
import axiosInstance from "../api/axiosInstance";
import type { ForumReply, ForumThread, ForumPost, ForumComment, ForumReplyBackend, BannedUsersResponse } from "../types/forum.type";

// Type helper for ID that can be string or object with _id
type UserIdLike = string | { _id: string } | { _id?: string };

// Helper function to normalize ID to string
function normalizeId(id: UserIdLike): string {
  if (typeof id === 'object' && id !== null) {
    return id._id ? String(id._id) : String(id);
  }
  return String(id);
}

function handleError(err: unknown): never {
  if (err instanceof Error) {
    console.groupCollapsed("[forum.service] API Error");
    console.error("message:", err.message);
    if (err instanceof AxiosError) {
      console.error("url:", err.config?.url);
      console.error("method:", err.config?.method);
      if (err.config?.data) {
        try {
          console.error("data:", JSON.parse(err.config.data as string));
        } catch {
          console.error("data (raw):", err.config.data);
        }
      }
      if (err.response) {
        console.error("status:", err.response.status);
        console.error("response:", err.response.data);
      } else {
        console.error("no response (network/CORS issue)");
      }
    }
    console.groupEnd();
  } else {
    console.error("[forum.service] Unknown error:", err);
  }
  throw err;
}

// Helper function to transform ForumPost to ForumThread
function transformPostToThread(post: ForumPost, comments: ForumComment[] = [], currentUserId?: string): ForumThread {
  const author = typeof post.authorId === 'object' && post.authorId ? post.authorId.name : 'Unknown';
  const authorId = typeof post.authorId === 'object' && post.authorId ? post.authorId._id : post.authorId;
  const authorAvatar = typeof post.authorId === 'object' && post.authorId ? post.authorId.avatar : undefined;
  
  // Determine user's reaction
  let myReaction: "like" | "dislike" | null = null;
  if (currentUserId) {
    const likes = post.likes || [];
    const dislikes = post.dislikes || [];
    // Handle both string and ObjectId formats
    const userIdStr = String(currentUserId);
    
    // Check dislikes first, then likes (dislike takes priority if user is in both)
    const foundInDislikes = dislikes.some((id: UserIdLike) => {
      return normalizeId(id) === userIdStr;
    });
    
    const foundInLikes = likes.some((id: UserIdLike) => {
      return normalizeId(id) === userIdStr;
    });
    
    // Dislike takes priority (shouldn't happen, but just in case)
    if (foundInDislikes) {
      myReaction = "dislike";
    } else if (foundInLikes) {
      myReaction = "like";
    }
  }
  
  // Transform comments to replies
  const replies: ForumReply[] = comments.map((comment) => {
    const commentAuthor = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.name : 'Unknown';
    const commentAuthorId = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId._id : comment.authorId;
    const commentAuthorAvatar = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.avatar : undefined;
    
    // Determine user's reaction for comment
    let commentMyReaction: "like" | "dislike" | null = null;
    if (currentUserId) {
      const commentLikes = comment.likes || [];
      const commentDislikes = comment.dislikes || [];
      const userIdStr = String(currentUserId);
      
      // Check dislikes first, then likes (dislike takes priority)
      const foundInDislikes = commentDislikes.some((id: UserIdLike) => {
        return normalizeId(id) === userIdStr;
      });
      
      const foundInLikes = commentLikes.some((id: UserIdLike) => {
        return normalizeId(id) === userIdStr;
      });
      
      if (foundInDislikes) {
        commentMyReaction = "dislike";
      } else if (foundInLikes) {
        commentMyReaction = "like";
      }
    }
    
      return {
        replyId: comment._id,
        threadId: post._id,
        content: comment.content,
        createdBy: commentAuthorId,
        author: commentAuthor,
        authorAvatar: commentAuthorAvatar,
        createdAt: comment.createdAt || new Date().toISOString(),
        reactions: {
          like: comment.likes?.length || 0,
          dislike: comment.dislikes?.length || 0,
        },
        images: comment.images || [],
        myReaction: commentMyReaction,
      } as ForumReply & { myReaction?: "like" | "dislike" | null };
  });

    return {
      threadId: post._id,
      title: post.title,
      content: post.content,
      createdBy: authorId,
      author: author,
      authorAvatar: authorAvatar,
      createdAt: typeof post.createdAt === 'string' ? post.createdAt : (post.createdAt?.toISOString() || new Date().toISOString()),
      reactions: {
        like: post.likes?.length || 0,
        dislike: post.dislikes?.length || 0,
      },
      replies: replies,
      pinned: post.pinned || false,
      images: post.images || [],
      myReaction: myReaction,
    };
}

// ====================
// Post/Thread APIs (using database)
// ====================
export const getThreads = async (currentUserId?: string): Promise<ForumThread[]> => {
  try {
    const res = await axiosInstance.get("/forum");
    const posts: ForumPost[] = res.data;
    
    // Fetch comments for each post
    const threadsWithComments = await Promise.all(
      posts.map(async (post) => {
        try {
          const commentsRes = await axiosInstance.get(`/forum/comment/${post._id}`);
          const comments: ForumComment[] = commentsRes.data;
          return transformPostToThread(post, comments, currentUserId);
        } catch (err) {
          console.warn(`Failed to fetch comments for post ${post._id}:`, err);
          return transformPostToThread(post, [], currentUserId);
        }
      })
    );
    
    return threadsWithComments;
  } catch (err: unknown) {
    return handleError(err);
  }
};

// Get comments for a thread (returns ForumComment[])
export const getThreadComments = async (postId: string): Promise<ForumComment[]> => {
  try {
    const commentsRes = await axiosInstance.get(`/forum/comment/${postId}`);
    const comments: ForumComment[] = commentsRes.data;
    return comments;
  } catch (err) {
    console.warn(`Failed to fetch comments for post ${postId}:`, err);
    return [];
  }
};

// Get thread with comments - optimized to use existing thread if available
export const getThread = async (id: string, existingThread?: ForumThread, currentUserId?: string): Promise<ForumThread> => {
  try {
    // If existing thread provided, only fetch comments
    if (existingThread) {
      const comments = await getThreadComments(id);
      // Transform comments to replies format
      const replies = comments.map((comment) => {
        const commentAuthor = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.name : 'Unknown';
        const commentAuthorId = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId._id : comment.authorId;
        const commentAuthorAvatar = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.avatar : undefined;
        
        // Determine user's reaction for comment
        let commentMyReaction: "like" | "dislike" | null = null;
        if (currentUserId) {
          const commentLikes = comment.likes || [];
          const commentDislikes = comment.dislikes || [];
          const userIdStr = String(currentUserId);
          
          const foundInDislikes = commentDislikes.some((id: UserIdLike) => {
            return normalizeId(id) === userIdStr;
          });
          
          const foundInLikes = commentLikes.some((id: UserIdLike) => {
            return normalizeId(id) === userIdStr;
          });
          
          if (foundInDislikes) {
            commentMyReaction = "dislike";
          } else if (foundInLikes) {
            commentMyReaction = "like";
          }
        }
        
        return {
          replyId: comment._id,
          threadId: id,
          content: comment.content,
          createdBy: commentAuthorId,
          author: commentAuthor,
          authorAvatar: commentAuthorAvatar,
          createdAt: comment.createdAt || new Date().toISOString(),
          reactions: {
            like: comment.likes?.length || 0,
            dislike: comment.dislikes?.length || 0,
          },
          images: comment.images || [],
          myReaction: commentMyReaction,
        } as ForumReply & { myReaction?: "like" | "dislike" | null };
      });
      return { ...existingThread, replies };
    }
    
    // Otherwise, fetch post and comments
    const res = await axiosInstance.get("/forum");
    const posts: ForumPost[] = res.data;
    const post = posts.find((p) => p._id === id);
    
    if (!post) {
      throw new Error("Thread not found");
    }
    
    // Fetch comments
    let comments: ForumComment[] = [];
    try {
      const commentsRes = await axiosInstance.get(`/forum/comment/${id}`);
      comments = commentsRes.data;
    } catch (err) {
      console.warn(`Failed to fetch comments for post ${id}:`, err);
      comments = [];
    }
    
    return transformPostToThread(post, comments, currentUserId);
  } catch (err) {
    return handleError(err);
  }
};

export const createThread = async (payload: { title: string; content: string; images?: File[] }) => {
  try {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("content", payload.content);
    
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    const res = await axiosInstance.post("/forum", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    // Transform response to ForumThread format
    const post: ForumPost = res.data.post;
    return transformPostToThread(post, []);
  } catch (err) {
    return handleError(err);
  }
};

export const createComment = async (postId: string, payload: { content: string; images?: File[] }) => {
  try {
    const formData = new FormData();
    formData.append("content", payload.content);
    
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    const res = await axiosInstance.post(`/forum/comment/${postId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    const comment: ForumComment = res.data.comment;
    const commentAuthor = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.name : 'Unknown';
    const commentAuthorId = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId._id : comment.authorId;
    
    return {
      replyId: comment._id,
      threadId: postId,
      content: comment.content,
      createdBy: commentAuthorId,
      author: commentAuthor,
      createdAt: comment.createdAt || new Date().toISOString(),
      reactions: {
        like: comment.likes?.length || 0,
        dislike: comment.dislikes?.length || 0,
      },
      images: comment.images || [],
    };
  } catch (err) {
    return handleError(err);
  }
};

export const updateThread = async (
  threadId: string,
  payload: { content?: string; images?: File[]; deleteImages?: string[] }
) => {
  try {
    const formData = new FormData();
    if (payload.content !== undefined) formData.append("content", payload.content);
    
    // Gửi deleteImages nếu có
    if (payload.deleteImages && payload.deleteImages.length > 0) {
      formData.append("deleteImages", JSON.stringify(payload.deleteImages));
    }
    
    // Gửi ảnh mới nếu có
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    const res = await axiosInstance.put(`/forum/post/${threadId}/update`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const deleteThread = async (threadId: string) => {
  try {
    const res = await axiosInstance.delete(`/forum/post/${threadId}/delete`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// ====================
// Comment/Reply APIs
// ====================
export const addReply = async (postId: string, payload: { content: string; images?: File[] }) => {
  // Use createComment for consistency
  return createComment(postId, payload);
};

export const deleteComment = async (commentId: string) => {
  try {
    const res = await axiosInstance.delete(`/forum/comment/${commentId}/delete`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const deleteReply = async (_threadId: string, replyId: string) => {
  try {
    const res = await axiosInstance.delete(`/forum/reply/${replyId}/delete`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const editReply = async (_threadId: string, replyId: string, content: string, images?: File[], deleteImages?: string[]) => {
  try {
    const formData = new FormData();
    formData.append("content", content);
    
    // Gửi deleteImages nếu có
    if (deleteImages && deleteImages.length > 0) {
      formData.append("deleteImages", JSON.stringify(deleteImages));
    }
    
    // Gửi ảnh mới nếu có
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    const res = await axiosInstance.put(`/forum/comment/${replyId}/update`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// ====================
// Reaction APIs
// ====================
export const reactThread = async (postId: string, type: "like" | "dislike") => {
  try {
    const endpoint = type === "like" ? `/forum/like/${postId}` : `/forum/dislike/${postId}`;
    const res = await axiosInstance.post(endpoint);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const reactReply = async (_threadId: string, replyId: string, type: "like" | "dislike") => {
  try {
    const endpoint = type === "like" 
      ? `/forum/comment/${replyId}/like` 
      : `/forum/comment/${replyId}/dislike`;
    const res = await axiosInstance.post(endpoint);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// ====================
// Pin/Unpin APIs (teacher/admin only)
// ====================
export const pinPost = async (postId: string) => {
  try {
    const res = await axiosInstance.post(`/forum/pin/${postId}`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const unpinPost = async (postId: string) => {
  try {
    const res = await axiosInstance.post(`/forum/unpin/${postId}`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// ====================
// Approve/Reject APIs (admin only)
// ====================
export const approvePost = async (postId: string) => {
  try {
    const res = await axiosInstance.post(`/forum/approve/${postId}`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const rejectPost = async (postId: string, reason?: string) => {
  try {
    const res = await axiosInstance.post(`/forum/reject/${postId}`, { reason });
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// ====================
// Pending Posts API (admin only)
// ====================
export const getPendingPosts = async (): Promise<ForumPost[]> => {
  try {
    const res = await axiosInstance.get("/forum/pending-posts");
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// ====================
// Reply to Comment APIs
// ====================
export const createReplyToComment = async (commentId: string, payload: { content: string; images?: File[] }) => {
  try {
    const formData = new FormData();
    formData.append("content", payload.content);
    
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    const res = await axiosInstance.post(`/forum/comment/${commentId}/reply`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const getRepliesToComment = async (commentId: string): Promise<ForumReplyBackend[]> => {
  try {
    const res = await axiosInstance.get(`/forum/comment/${commentId}/replies`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const likeReplyToComment = async (replyId: string) => {
  try {
    const res = await axiosInstance.post(`/forum/reply/${replyId}/like`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const dislikeReplyToComment = async (replyId: string) => {
  try {
    console.log("[forum.service] POST /forum/reply/:replyId/dislike");
    const res = await axiosInstance.post(`/forum/reply/${replyId}/dislike`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const updateReplyToComment = async (replyId: string, content: string, images?: File[], deleteImages?: string[]) => {
  try {
    const formData = new FormData();
    formData.append("content", content);
    
    // Gửi deleteImages nếu có
    if (deleteImages && deleteImages.length > 0) {
      formData.append("deleteImages", JSON.stringify(deleteImages));
    }
    
    // Gửi ảnh mới nếu có
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append("images", image);
      });
    }
    
    const res = await axiosInstance.put(`/forum/reply/${replyId}/update`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const deleteReplyToComment = async (replyId: string) => {
  try {
    const res = await axiosInstance.delete(`/forum/reply/${replyId}/delete`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// ====================
// Search API
// ====================
export interface SearchPostsResponse {
  data: ForumPost[];
  suggestions: Array<{ id: string; title: string }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const searchPosts = async (
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<SearchPostsResponse> => {
  try {
    const res = await axiosInstance.get("/forum/search", {
      params: { q: query, page, limit },
    });
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

// Ban management functions
export const getForumBanInfo = async (userId: string) => {
  try {
    const res = await axiosInstance.get(`/forum/admin/user-ban/${userId}`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const unbanForumUser = async (userId: string) => {
  try {
    const res = await axiosInstance.post(`/forum/admin/unban/${userId}`);
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};

export const getBannedUsers = async (
  page: number = 1,
  limit: number = 20,
  searchQuery: string = ""
): Promise<BannedUsersResponse> => {
  try {
    const res = await axiosInstance.get("/forum/admin/banned-users", {
      params: { page, limit, q: searchQuery },
    });
    return res.data;
  } catch (err) {
    return handleError(err);
  }
};