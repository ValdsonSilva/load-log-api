import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),

    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
    GOOGLE_DOCUMENT_AI_PROJECT_ID: z.string().optional(),
    GOOGLE_DOCUMENT_AI_LOCATION: z.string().optional(),
    GOOGLE_DOCUMENT_AI_PROCESSOR_ID: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
