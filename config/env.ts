
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
});

export const env = EnvSchema.parse(process.env);
