import { env } from "../../config/env.js";
import { AppError } from "../../utils/error.js";

type RemoteOcrResponse = {
    ok: boolean;
    error?: string | null;
    text?: string;
    metadata?: {
        documentType?: string;
        fileName?: string;
        mimeType?: string;
        sizeBytes?: number;
        processingMs?: number;
    };
};

export class RemoteOcrService {
    async extractTextFromFile(file: Express.Multer.File, documentType: string) {
        if (!env.OCR_SERVICE_URL) {
            throw new AppError(500, "OCR_SERVICE_URL is not configured");
        }

        if (!file?.buffer?.length) {
            throw new AppError(400, "OCR file is required");
        }

        const form = new FormData();

        form.append("documentType", documentType);

        const blob = new Blob([new Uint8Array(file.buffer)], {
            type: file.mimetype || "application/octet-stream",
        });

        form.append("file", blob, file.originalname || "document");

        const headers: Record<string, string> = {};

        if (env.OCR_SERVICE_API_KEY) {
            headers.Authorization = `Bearer ${env.OCR_SERVICE_API_KEY}`;
        }

        const baseUrl = env.OCR_SERVICE_URL.replace(/\/$/, "");

        const response = await fetch(`${baseUrl}/ocr/extract`, {
            method: "POST",
            headers,
            body: form,
        });

        const rawResponse = await response.text();

        let data: RemoteOcrResponse | any;

        try {
            data = JSON.parse(rawResponse);
        } catch {
            throw new AppError(
                502,
                `Remote OCR returned invalid JSON: ${rawResponse.slice(0, 500)}`
            );
        }

        if (!response.ok) {
            throw new AppError(
                response.status,
                data?.detail || data?.error || "Remote OCR service failed"
            );
        }

        if (!data.ok) {
            throw new AppError(
                422,
                data?.error || "Remote OCR could not extract text"
            );
        }

        const text = data.text?.trim();

        if (!text || text.length < 20) {
            throw new AppError(422, "Remote OCR did not extract enough text");
        }

        return text;
    }
}