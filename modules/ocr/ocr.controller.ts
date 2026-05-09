import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { ParseLoadDocumentBodySchema } from "./ocr.schema.js";
import { OcrService } from "./ocr.service.js";

const service = new OcrService();

export const parseLoadDocument: RequestHandler = async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

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

    res.status(200).json(result);
};