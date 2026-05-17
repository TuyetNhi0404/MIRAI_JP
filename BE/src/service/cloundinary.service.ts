import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// Upload file lên Cloudinary
export const uploadToCloudinary = async (
  files: Express.Multer.File | Express.Multer.File[]
): Promise<string[]> => {
  const fileArray = Array.isArray(files) ? files : [files];
  const uploadedUrls: string[] = [];

  for (const file of fileArray) {
    const safeFileName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "");

    let resourceType: "image" | "video" | "raw" = "raw";
    if (file.mimetype.startsWith("image/")) resourceType = "image";
    else if (file.mimetype.startsWith("video/")) resourceType = "video";

    const url = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "assignments",
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          filename_override: `${Date.now()}_${safeFileName}`,
        },
        (error: any, result: any) => {
          if (error || !result) {
            return reject(error || new Error("Unable to get information from Cloudinary"));
          }
          resolve(result.secure_url);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    uploadedUrls.push(url);
  }

  return uploadedUrls;
};

export const uploadImagesPostsToCloudinary = async (
  files: Express.Multer.File | Express.Multer.File[]
): Promise<string[]> => {
  const fileArray = Array.isArray(files) ? files : [files];
  const uploadedUrls: string[] = [];

  for (const file of fileArray) {
    const safeFileName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "");

    let resourceType: "image" | "video" | "raw" = "raw";
    if (file.mimetype.startsWith("image/")) resourceType = "image";
    else if (file.mimetype.startsWith("video/")) resourceType = "video";

    const url = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "posts",
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          filename_override: `${Date.now()}_${safeFileName}`,
        },
        (error: any, result: any) => {
          if (error || !result) {
            return reject(error || new Error("Unable to get information from Cloudinary"));
          }
          resolve(result.secure_url);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    uploadedUrls.push(url);
  }

  return uploadedUrls;
}

export const uploadImagesCommentToCloudinary = async (
  files: Express.Multer.File | Express.Multer.File[]
): Promise<string[]> => {
  const fileArray = Array.isArray(files) ? files : [files];
  const uploadedUrls: string[] = [];

  for (const file of fileArray) {
    const safeFileName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "");

    let resourceType: "image" | "video" | "raw" = "raw";
    if (file.mimetype.startsWith("image/")) resourceType = "image";
    else if (file.mimetype.startsWith("video/")) resourceType = "video";

    const url = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "comments",
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          filename_override: `${Date.now()}_${safeFileName}`,
        },
        (error: any, result: any) => {
          if (error || !result) {
            return reject(error || new Error("Unable to get information from Cloudinary"));
          }
          resolve(result.secure_url);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    uploadedUrls.push(url);
  }

  return uploadedUrls;
}

export const uploadAvatarToCloudinary = async (file: Express.Multer.File): Promise<string> => {
  if (!file) throw new Error("No file provided for avatar upload");

  const safeFileName = file.originalname
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "");

  const url = await new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "avatars",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: true,
        filename_override: `${Date.now()}_${safeFileName}`,
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }], // 👈 resize avatar
      },
      (error: any, result: any) => {
        if (error || !result) {
          return reject(error || new Error("Unable to get information from Cloudinary"));
        }
        resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });

  return url;
};

// Xóa file khỏi Cloudinary
export const deleteFileFromCloudinary = async (fileUrl: string): Promise<void> => {
  try {
    if (!fileUrl || typeof fileUrl !== "string") {
      throw new Error("Invalid fileUrl");
    }

    const [prefix = "", afterPart = ""] = fileUrl.split("/upload/");
    if (!afterPart) throw new Error("Invalid Cloudinary URL");

    let resourceType: "image" | "video" | "raw" = "raw";
    if (prefix.includes("/image")) resourceType = "image";
    else if (prefix.includes("/video")) resourceType = "video";

    let after = afterPart.split("?")[0] ?? "";
    after = after.replace(/^v\d+\//, "");
    const publicId = after.replace(/\.[^/.]+$/, "");

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result !== "ok" && result.result !== "not found") {
      console.warn("Cloudinary destroy result:", result);
    } else {
      console.log(`Deleted Cloudinary file: ${publicId} (${resourceType})`);
    }
  } catch (error: any) {
    console.error("Error deleting Cloudinary file:", error.message || error);
  }
};
