import OpenAI from "openai";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/error.js";
import { LoadDraftJsonSchema } from "./ocr.schema.js";

export class LoadDocumentParser {
    private client: OpenAI | null = env.OPENAI_API_KEY
        ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
        : null;

    async parseLoadText(params: {
        text: string; // texto passado pelo app
        documentType: string; // tipo de documento
    }) {
        if (!this.client) {
            throw new AppError(500, "OPENAI_API_KEY is not configured");
        }

        const cleanedText = params.text.slice(0, 30000);

        const response = await this.client.responses.create({
            model: env.OPENAI_MODEL,
            input: [
                {
                    role: "system",
                    content: `
                        You are a trucking document extraction engine for My Load Log.

                        Your job:
                        Extract structured load data from OCR text.

                        Rules:
                        - Return only valid JSON matching the provided schema.
                        - Do not invent data.
                        - If a field is unclear, use null.
                        - Use confidence carefully.
                        - This is a draft for driver review, not a final load.
                        - Dates should be ISO strings when possible.
                        - Preserve important instructions in notes/specialInstructions.
                        - Convert money to number.
                        - Convert weight to pounds when clearly stated.
                        - Map trailer/load types to: DRY_VAN, REEFER, FLATBED, STEPDECK, POWER_ONLY, OTHER.
                        - Map stops to PICKUP, DELIVERY, or STOP_OFF.
                        - Every unclear field should be added to missingFields or warnings.
                                `,
                },
                {
                    role: "user",
                    content: `
                        Document type: ${params.documentType}

                        OCR text:
                        ${cleanedText}
                `,
                },
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "load_document_draft",
                    strict: true,
                    schema: LoadDraftJsonSchema,
                },
            },
        });

        const outputText = response.output_text;

        if (!outputText) {
            throw new AppError(502, "AI parser returned empty response");
        }

        return JSON.parse(outputText);
    }
}