import { Types } from "mongoose";
import { ForumBan } from "../model/forumBan.model";

// Lấy hoặc tạo record ForumBan cho 1 user
export const getOrCreateForumBan = async (userId: string | Types.ObjectId) => {
    const uid = typeof userId === "string" ? new Types.ObjectId(userId) : userId;

    let fb = await ForumBan.findOne({ userId: uid });
    if (!fb) {
        fb = await ForumBan.create({
            userId: uid,
            count: 0,
            blocked: false,
            permanent: false,
            bannedUntil: null,
            reason: "",
        });
    }
    return fb;
};

// check trạng thái ban để dùng trong create post/comment/like...
export const checkUserBanStatus = async (userId: string) => {
    const fb = await ForumBan.findOne({ userId });

    if (!fb) {
        return { isBanned: false, reason: "" };
    }

    // ban vĩnh viễn
    if (fb.permanent && fb.blocked) {
        return {
            isBanned: true,
            reason: fb.reason || "You are permanently banned from posting and interacting",
        };
    }

    // ban theo thời gian
    if (fb.blocked && fb.bannedUntil) {
        const now = new Date();
        const bannedUntilDate = new Date(fb.bannedUntil);
        if (now < bannedUntilDate) {
            const unbanDateStr = bannedUntilDate.toLocaleDateString("en-US");
            return {
                isBanned: true,
                reason:
                    fb.reason ||
                    `You are banned from posting and interacting until ${unbanDateStr}`,
            };
        }

        // hết hạn ban → tự gỡ ban (không reset count)
        fb.blocked = false;
        fb.bannedUntil = null;
        fb.reason = "";
        await fb.save();
    }

    return { isBanned: false, reason: "" };
};

// áp dụng rule khi reject 1 bài
export const applyRejectPenalty = async (userId: string) => {
    const fb = await getOrCreateForumBan(userId);

    fb.count = (fb.count || 0) + 1;
    fb.blocked = false;
    fb.permanent = false;
    fb.bannedUntil = null;

    let banMessage = "Warning, not banned yet";
    let reason =
        "Your post was rejected. This is your first violation, please be careful when posting.";
    // 1: cảnh cáo (không ban, chỉ warning)
    // 2: ban 7 ngày
    // 3: ban 30 ngày
    // >=4: ban vĩnh viễn
    if (fb.count === 1) {
        fb.blocked = false;
        fb.permanent = false;
    } else if (fb.count === 2) {
        fb.blocked = true;
        fb.permanent = false;
        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + 7);
        fb.bannedUntil = bannedUntil;

        const unbanDateStr = bannedUntil.toLocaleDateString("en-US");
        banMessage = "Banned from posting and interacting for 7 days";
        reason = `Your post was rejected for the 2nd time. You are banned from posting and interacting until ${unbanDateStr}.`;
    } else if (fb.count === 3) {
        fb.blocked = true;
        fb.permanent = false;
        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + 30);
        fb.bannedUntil = bannedUntil;

        const unbanDateStr = bannedUntil.toLocaleDateString("en-US");
        banMessage = "Banned from posting and interacting for 30 days";
        reason = `Your post was rejected for the 3rd time. You are banned from posting and interacting until ${unbanDateStr}.`;
    } else if (fb.count >= 4) {
        fb.blocked = true;
        fb.permanent = true;
        fb.bannedUntil = null;

        banMessage = "Permanently banned from posting and interacting";
        reason =
            "Your post was rejected multiple times. You are permanently banned from posting and interacting.";
    }

    fb.reason = reason;
    await fb.save();

    return {
        count: fb.count,
        blocked: fb.blocked,
        permanent: fb.permanent,
        bannedUntil: fb.bannedUntil,
        banMessage,
        reason,
    };
};

// Gỡ ban hoàn toàn (admin decision) - RESET count
export const unbanUserPermanent = async (userId: string) => {
    const fb = await ForumBan.findOne({ userId });
    if (!fb) return null;

    fb.count = 0; // Reset lại từ đầu
    fb.blocked = false;
    fb.permanent = false;
    fb.bannedUntil = null;
    fb.reason = "";
    await fb.save();

    return fb;
};

export const getBanInfo = async (userId: string) => {
    const fb = await ForumBan.findOne({ userId });

    if (!fb) {
        // Chưa từng bị ban / chưa có record
        return {
            userId,
            blocked: false,
            permanent: false,
            count: 0,
            bannedUntil: null,
            reason: "",
        };
    }

    return {
        userId,
        blocked: fb.blocked,
        permanent: fb.permanent,
        count: fb.count,
        bannedUntil: fb.bannedUntil ?? null,
        reason: fb.reason ?? "",
    };
};