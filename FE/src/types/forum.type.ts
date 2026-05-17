export type ReactionType = 'like' | 'dislike';

export interface ReactionCount { 
  like: number;
  dislike: number;
}

// Backend types (from MongoDB)
export interface ForumPost {
  _id: string;
  authorId: string | { _id: string; name: string; avatar?: string; role?: string };
  title: string;
  content: string;
  images: string[];
  likes: string[];
  dislikes: string[];
  pinned?: boolean;
  pinnedBy?: string | { _id: string; name: string; avatar?: string; role?: string } | null;
  pinnedAt?: Date | null;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ForumComment {
  _id: string;
  postId: string;
  authorId: string | { _id: string; name: string; avatar?: string; role?: string };
  content: string;
  images?: string[];
  likes?: string[];
  dislikes?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Backend ForumReply type (replies to comments)
export interface ForumReplyBackend {
  _id: string;
  commentId: string;
  authorId: string | { _id: string; name: string; avatar?: string; role?: string };
  content: string;
  images?: string[];
  likes?: string[];
  dislikes?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Frontend types (compatible with both number and string IDs)
export interface ForumReply {
  replyId: string | number;
  threadId: string | number;
  content: string;
  createdBy: string | number;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  reactions: ReactionCount;
  images?: string[];
}

export interface ForumThread {
  threadId: string | number;
  title: string;
  content: string;
  createdBy?: string | number;
  author?: string;
  authorAvatar?: string;
  createdAt: string;
  reactions: ReactionCount;
  replies: ForumReply[];
  myReaction?: ReactionType | null;
  pinned?: boolean;
  images?: string[];
  status?: "pending" | "approved" | "rejected";
}

// Forum Ban types
export interface ForumBanInfo {
  userId: string;
  blocked: boolean;
  permanent: boolean;
  count: number;
  bannedUntil: Date | null;
  reason: string;
}

export interface ForumBan {
  _id: string;
  userId: string | { _id: string; name: string; email: string; role: string; avatar?: string; status?: string };
  count: number;
  blocked: boolean;
  permanent: boolean;
  bannedUntil: Date | null;
  reason: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface BannedUsersResponse {
  data: ForumBan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}