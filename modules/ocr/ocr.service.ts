import { AppError } from "../../utils/error.js";
import { LoadDocumentParser } from "./ocr.parser.js";

export class OcrService {
    constructor(private parser = new LoadDocumentParser()) { }

    async parseLoadDocument(params: {
        userId: string;
        rawText?: string;
        file?: Express.Multer.File;
        documentType: string;
    }) {
        const text = params.rawText?.trim() || await this.extractTextFromFile(params.file);

        if (!text || text.length < 20) {
            throw new AppError(400, "Could not extract enough text from document");
        }

        const parsed = await this.parser.parseLoadText({
            text,
            documentType: params.documentType,
        });

        return {
            ...parsed,
            source: {
                documentType: params.documentType,
                hasFile: Boolean(params.file),
                fileName: params.file?.originalname ?? null,
                mimeType: params.file?.mimetype ?? null,
                extractedTextPreview: text.slice(0, 500),
            },
        };
    }

    private async extractTextFromFile(file?: Express.Multer.File) {
        if (!file) return null;

        throw new AppError(
            501,
            "Backend OCR is not configured yet. Send rawText from the app."
        );
    }
}