import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { env } from "../config/env.js";

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

export type CloudinaryUploadResult = {
    publicId: string;
    secureUrl: string;
    bytes: number;
    resourceType: string; // image | raw | video
};

export async function uploadBufferToCloudinary(params: {
    buffer: Buffer;
    folder: string;
    fileName?: string;
}): Promise<CloudinaryUploadResult> {
    const { buffer, folder, fileName } = params;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto",
                use_filename: true,
                unique_filename: true,
                filename_override: fileName,
            },
            (err, result) => {
                if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
                resolve({
                    publicId: result.public_id,
                    secureUrl: result.secure_url,
                    bytes: result.bytes,
                    resourceType: result.resource_type,
                });
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

export async function deleteFromCloudinary(params: {
    publicId: string;
    resourceType: string;
}) {
    const { publicId, resourceType } = params;
    await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as any,
        invalidate: true,
    });
}
