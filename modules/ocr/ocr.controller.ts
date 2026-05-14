import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { ParseLoadDocumentBodySchema } from "./ocr.schema.js";
import { OcrService } from "./ocr.service.js";

const service = new OcrService();

export const parseLoadDocument: RequestHandler = async (req, res) => {
    try {
        const userId = req.auth?.userId;

        if (!userId) {
            throw new AppError(401, "Unauthorized");
        }

        console.log({ userId })
        console.log("OCR BODY:", req.body);
        console.log("OCR FILE:", req.file);

        const body = ParseLoadDocumentBodySchema.parse(req.body);

        if (!body.rawText && !req.file) {
            throw new AppError(400, "rawText or file is required");
        }

        const result = await service.parseLoadDocument({
            userId,
            rawText: body.rawText,
            file: req.file,
            documentType: body.documentType,
        });

        return res.status(200).json(result);
    } catch (err: any) {
        console.error("OCR CONTROLLER ERROR:", {
            name: err?.name,
            message: err?.message,
            stack: err?.stack,
            details: err?.details,
        });

        if (err instanceof AppError) {
            return res.status(err.statusCode).json({
                error: err.message,
                details: err.details ?? null,
            });
        }

        return res.status(500).json({
            error: err?.message || "Erro interno ao processar OCR load draft",
        });
    }
};