import { AppError } from "../../utils/error.js";
import { LoadDocumentParser } from "./ocr.parser.js";
import { RemoteOcrService } from "./remote-ocr.service.js";
import { BolDraftParser } from "./bol-draft.parser.js";

export class OcrService {
    constructor(
        private parser = new LoadDocumentParser(),
        private remoteOcr = new RemoteOcrService(),
        private bolDraftParser = new BolDraftParser()
    ) { }

    async parseLoadDocument(params: {
        userId: string;
        rawText?: string;
        file?: Express.Multer.File;
        documentType: string;
    }) {
        const startedAt = Date.now();

        console.log("[OCR] start", {
            documentType: params.documentType,
            hasFile: Boolean(params.file),
            fileName: params.file?.originalname,
        });

        const ocrStartedAt = Date.now();

        const text =
            params.rawText?.trim() ||
            await this.extractTextFromFile(params.file, params.documentType);

        console.log("[OCR] text extracted", {
            ms: Date.now() - ocrStartedAt,
            textLength: text?.length ?? 0,
        });

        if (!text || text.length < 20) {
            throw new AppError(400, "Could not extract enough text from document");
        }

        this.assertLooksLikeLoadDocument(text, params.documentType);

        const detectedDocumentType = this.detectDocumentType(
            text,
            params.documentType
        );
        const parserStartedAt = Date.now();

        const parsed =
            detectedDocumentType === "BOL"
                ? this.bolDraftParser.parse(text)
                : await this.parser.parseLoadText({
                    text,
                    documentType: detectedDocumentType,
                });

        console.log("[OCR] parser finished", {
            ms: Date.now() - parserStartedAt,
            detectedDocumentType,
            parser: detectedDocumentType === "BOL" ? "local-bol-parser" : "ai-parser",
        });

        this.assertParsedDraftHasLoadSignals(parsed);

        console.log("[OCR] completed", {
            totalMs: Date.now() - startedAt,
        });

        return {
            ...parsed,
            source: {
                requestedDocumentType: params.documentType,
                detectedDocumentType,
                hasFile: Boolean(params.file),
                fileName: params.file?.originalname ?? null,
                mimeType: params.file?.mimetype ?? null,
                extractedTextPreview: text.slice(0, 500),
            },
        };
    }

    private async extractTextFromFile(
        file: Express.Multer.File | undefined,
        documentType: string
    ) {
        if (!file) return null;

        return this.remoteOcr.extractTextFromFile(file, documentType);
    }

    private detectDocumentType(text: string, requestedDocumentType: string) {
        const normalized = text.toLowerCase();

        if (
            normalized.includes("master bill of lading") ||
            normalized.includes("bill of lading") ||
            normalized.includes("non-negotiable") ||
            normalized.includes("b/l")
        ) {
            return "BOL";
        }

        if (
            normalized.includes("rate confirmation") ||
            normalized.includes("rate con") ||
            normalized.includes("load confirmation")
        ) {
            return "RATE_CONFIRMATION";
        }

        if (
            normalized.includes("dispatch sheet") ||
            normalized.includes("dispatcher") ||
            normalized.includes("dispatch")
        ) {
            return "DISPATCH_SHEET";
        }

        return requestedDocumentType;
    }

    private assertLooksLikeLoadDocument(text: string, documentType: string) {
        const normalized = text.toLowerCase();

        const strongLoadSignals = [
            "rate confirmation",
            "rate con",
            "load confirmation",
            "load tender",
            "dispatch sheet",
            "bill of lading",
            "bol",
            "master bill",
            "broker",
            "carrier",
            "shipper",
            "receiver",
            "pickup",
            "pick up",
            "delivery",
            "deliver to",
            "consignee",
            "commodity",
            "trailer",
            "reefer",
            "dry van",
            "flatbed",
            "mc#",
            "mc number",
            "dot",
            "load number",
            "load id",
            "pickup number",
            "po number",
        ];

        const negativeSignals = [
            "pix",
            "comprovante",
            "cpf",
            "agencia",
            "conta",
            "banco do brasil",
            "nubank",
            "pagador",
            "recebedor",
            "chavepix",
            "transferencia",
            "transferência",
        ];

        const loadSignalCount = strongLoadSignals.filter((signal) =>
            normalized.includes(signal)
        ).length;

        const negativeSignalCount = negativeSignals.filter((signal) =>
            normalized.includes(signal)
        ).length;

        if (negativeSignalCount >= 2 && loadSignalCount < 2) {
            throw new AppError(
                422,
                "The uploaded file does not look like a trucking load document. Please upload a rate confirmation, BOL, dispatch sheet, or load sheet."
            );
        }

        if (documentType !== "OTHER" && loadSignalCount < 2) {
            throw new AppError(
                422,
                "Could not identify enough load-related information in this document. Please upload a clearer rate confirmation, BOL, or dispatch sheet."
            );
        }
    }

    private assertParsedDraftHasLoadSignals(parsed: any) {
        const draft = parsed?.draft ?? {};

        const hasLoadNumber = Boolean(draft.loadNumber);
        const hasBolNumber = Boolean(draft.bolNumber);
        const hasProNumber = Boolean(draft.proNumber);
        const hasCarrier = Boolean(draft.carrierCompanyName);
        const hasBroker = Boolean(draft.brokerCompanyName);
        const hasPickup =
            Boolean(draft.expectedPickupCity) || Boolean(draft.expectedPickupState);
        const hasDelivery =
            Boolean(draft.expectedDeliveryCity) || Boolean(draft.expectedDeliveryState);
        const hasCommodity = Boolean(draft.commodityDesc);
        const hasTrailer = Boolean(draft.equipmentSpec?.trailerType);
        const hasWeight = Boolean(draft.equipmentSpec?.weightLbs);

        const signalCount = [
            hasLoadNumber,
            hasBolNumber,
            hasProNumber,
            hasCarrier,
            hasBroker,
            hasPickup,
            hasDelivery,
            hasCommodity,
            hasTrailer,
            hasWeight,
        ].filter(Boolean).length;

        if (signalCount < 2) {
            throw new AppError(
                422,
                "The document was read, but it does not contain enough load details to generate a reliable draft."
            );
        }
    }
}