import '../config/cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

export const uploadAudioToCloudinary = (fileBuffer: Buffer, folder: string = 'listening_audio'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video', // Cloudinary uses 'video' for audio files too
      },
      (error, result) => {
        if (error) return reject(error);
        if (result) return resolve(result.secure_url);
        reject(new Error('Upload failed'));
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};
