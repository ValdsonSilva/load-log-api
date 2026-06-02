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

    PADDLE_OCR_PYTHON_BIN: z.string().default("python"),
    PADDLE_OCR_SCRIPT_PATH: z.string().default("./scripts/paddle_ocr.py"),

    OCR_PROVIDER: z.enum(["remote", "paddle"]).default("remote"),
    OCR_SERVICE_URL: z.string().url().optional(),
    OCR_SERVICE_API_KEY: z.string().optional(),

    AI_PROVIDER: z
        .enum(["openai_compatible", "ollama", "openai"])
        .default("openai_compatible"),

    AI_BASE_URL: z.string().url().default("https://ai.kouvri.com/v1"),
    AI_API_KEY: z.string().min(1),
    AI_MODEL: z.string().default("qwen2.5-coder:14b"),

    OLLAMA_BASE_URL: z.string().url().optional(),
    OLLAMA_MODEL: z.string().optional(),

    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);