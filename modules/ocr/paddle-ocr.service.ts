import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/error.js";

type PaddleOcrResponse = {
    ok: boolean;
    error?: string | null;
    text?: string;
};

export class PaddleOcrService {
    async extractTextFromFile(file: Express.Multer.File) {
        if (!file?.buffer?.length) {
            throw new AppError(400, "OCR file is required");
        }

        this.assertAllowedFile(file);

        const tempDir = path.join(process.cwd(), "tmp", "ocr");
        await mkdir(tempDir, { recursive: true });

        const extension = this.getExtension(file);
        const filePath = path.join(tempDir, `${nanoid()}${extension}`);

        await writeFile(filePath, file.buffer);

        try {
            const result = await this.runPaddleOcr(filePath);

            if (!result.ok) {
                throw new AppError(
                    502,
                    `PaddleOCR failed: ${result.error || "Unknown OCR error"}`
                );
            }

            const text = result.text?.trim();

            if (!text || text.length < 20) {
                throw new AppError(422, "PaddleOCR could not extract enough text");
            }

            return text;
        } finally {
            await rm(filePath, { force: true });
        }
    }

    private runPaddleOcr(filePath: string) {
        return new Promise<PaddleOcrResponse>((resolve, reject) => {
            const child = spawn(env.PADDLE_OCR_PYTHON_BIN, [
                env.PADDLE_OCR_SCRIPT_PATH,
                "--file",
                filePath,
                "--lang",
                "en",
            ]);

            const timeout = setTimeout(() => {
                child.kill("SIGKILL");
                reject(new AppError(504, "PaddleOCR timed out while processing document"));
            }, 120_000);

            let stdout = "";
            let stderr = "";

            child.stdout.on("data", (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });

            child.on("error", (error) => {
                clearTimeout(timeout);
                reject(
                    new AppError(
                        502,
                        `Could not start PaddleOCR process: ${error.message}`
                    )
                );
            });

            child.on("close", () => {
                clearTimeout(timeout);

                const output = stdout.trim();

                try {
                    const jsonStart = output.lastIndexOf("{");
                    const jsonText = jsonStart >= 0 ? output.slice(jsonStart) : output;
                    const parsed = JSON.parse(jsonText) as PaddleOcrResponse;
                    resolve(parsed);
                } catch {
                    reject(
                        new AppError(
                            502,
                            `Invalid PaddleOCR response. stderr: ${stderr || "empty"}`
                        )
                    );
                }
            });
        });
    }

    private assertAllowedFile(file: Express.Multer.File) {
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new AppError(
                400,
                "Unsupported OCR file type. Use JPG, PNG, WEBP, or PDF."
            );
        }
    }

    private getExtension(file: Express.Multer.File) {
        if (file.mimetype === "image/jpeg") return ".jpg";
        if (file.mimetype === "image/png") return ".png";
        if (file.mimetype === "image/webp") return ".webp";
        if (file.mimetype === "application/pdf") return ".pdf";

        return path.extname(file.originalname || "") || ".bin";
    }
}