import OpenAI from "openai";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/error.js";

export class LoadDocumentParser {
    private client = new OpenAI({
        apiKey: env.AI_API_KEY,
        baseURL: env.AI_BASE_URL,
    });

    async parseLoadText(params: {
        text: string;
        documentType: string;
    }) {
        const cleanedText = params.text.slice(0, 30000);

        try {
            const response = await this.client.chat.completions.create({
                model: env.AI_MODEL,
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: `
You are a trucking document extraction engine for My Load Log.

Extract structured load data from OCR text.

Rules:
- Return only valid JSON.
- Do not include markdown.
- Do not explain anything.
- Do not invent data.
- If a field is unclear, use null.
- Use confidence carefully.
- This is a draft for driver review, not a final load.
- Dates should be ISO date strings when possible, like 2026-05-10.
- Times should use 24-hour format when possible, like 08:00.
- Convert money to number.
- Convert weight to pounds when clearly stated.
- Preserve important instructions in specialInstructions.
- Normalize equipmentType to one of these values when possible:
  DRY_VAN, REEFER, FLATBED, STEPDECK, POWER_ONLY, OTHER.
- If the text says "trailer dry van", return "DRY_VAN".
- If unclear, return null.
                        `.trim(),
                    },
                    {
                        role: "user",
                        content: `
Document type: ${params.documentType}

Return the extracted load draft as JSON with exactly this shape:

{
  "status": "needs_review",
  "confidence": 0.8,
  "draft": {
    "loadNumber": null,
    "brokerCompanyName": null,
    "pickupLocation": null,
    "pickupDate": null,
    "pickupTime": null,
    "deliveryLocation": null,
    "deliveryDate": null,
    "deliveryTime": null,
    "rateAmount": null,
    "commodity": null,
    "weightLbs": null,
    "equipmentType": null,
    "specialInstructions": null
  },
  "fieldConfidence": {
    "loadNumber": "missing",
    "brokerCompanyName": "missing",
    "pickupLocation": "missing",
    "pickupDate": "missing",
    "pickupTime": "missing",
    "deliveryLocation": "missing",
    "deliveryDate": "missing",
    "deliveryTime": "missing",
    "rateAmount": "missing",
    "commodity": "missing",
    "weightLbs": "missing",
    "equipmentType": "missing",
    "specialInstructions": "missing"
  },
  "missingFields": [],
  "warnings": []
}

Allowed fieldConfidence values:
"high", "medium", "low", "missing"

OCR text:
${cleanedText}
                        `.trim(),
                    },
                ],
            });

            const outputText = response.choices[0]?.message?.content;

            if (!outputText) {
                throw new AppError(502, "AI parser returned empty response");
            }

            const cleanedJson = this.extractJson(outputText);
            const parsed = JSON.parse(cleanedJson);

            return this.normalizeParsedDraft(parsed);
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err;
            }

            if (err?.status === 401 || err?.status === 403) {
                // throw new AppError(503, "AI API authentication failed");
                console.error("AI AUTH ERROR DETAILS:", {
                    status: err?.status,
                    message: err?.message,
                    code: err?.code,
                    type: err?.type,
                    baseURL: env.AI_BASE_URL,
                    model: env.AI_MODEL,
                    hasKey: Boolean(env.AI_API_KEY),
                    keyLength: env.AI_API_KEY?.length,
                    keyStart: env.AI_API_KEY?.slice(0, 4),
                    keyEnd: env.AI_API_KEY?.slice(-4),
                });

                throw new AppError(503, "AI API authentication failed");
            }

            if (err?.status === 404) {
                throw new AppError(503, "AI model or endpoint was not found");
            }

            if (err?.status === 429) {
                throw new AppError(503, "AI API rate limit or quota exceeded");
            }

            if (err?.message?.includes("Unexpected token")) {
                throw new AppError(502, "AI parser returned invalid JSON");
            }

            throw new AppError(
                503,
                `AI parser request failed: ${err?.message || "Unknown error"}`
            );
        }
    }

    private extractJson(text: string) {
        const trimmed = text.trim();

        if (trimmed.startsWith("```")) {
            return trimmed
                .replace(/^```json/i, "")
                .replace(/^```/i, "")
                .replace(/```$/i, "")
                .trim();
        }

        const firstBrace = trimmed.indexOf("{");
        const lastBrace = trimmed.lastIndexOf("}");

        if (firstBrace === -1 || lastBrace === -1) {
            throw new AppError(502, "AI parser did not return JSON");
        }

        return trimmed.slice(firstBrace, lastBrace + 1);
    }

    private normalizeParsedDraft(parsed: any) {
        const draftKeys = [
            "loadNumber",
            "brokerCompanyName",
            "pickupLocation",
            "pickupDate",
            "pickupTime",
            "deliveryLocation",
            "deliveryDate",
            "deliveryTime",
            "rateAmount",
            "commodity",
            "weightLbs",
            "equipmentType",
            "specialInstructions",
        ];

        const draft: Record<string, any> = {};
        const fieldConfidence: Record<string, string> = {};

        for (const key of draftKeys) {
            // draft[key] = parsed?.draft?.[key] ?? null;
            if (key === "equipmentType") {
                draft[key] = this.normalizeEquipmentType(parsed?.draft?.[key]);
            } else {
                draft[key] = parsed?.draft?.[key] ?? null;
            }

            const confidence = parsed?.fieldConfidence?.[key];

            fieldConfidence[key] = ["high", "medium", "low", "missing"].includes(confidence)
                ? confidence
                : draft[key] === null
                    ? "missing"
                    : "medium";
        }

        return {
            status: "needs_review",
            confidence:
                typeof parsed?.confidence === "number"
                    ? Math.max(0, Math.min(1, parsed.confidence))
                    : 0.5,
            draft,
            fieldConfidence,
            missingFields: Array.isArray(parsed?.missingFields)
                ? parsed.missingFields
                : draftKeys.filter((key) => draft[key] === null),
            warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
        };
    }

    private normalizeEquipmentType(value: unknown) {
        if (typeof value !== "string") return null;

        const normalized = value.toLowerCase();

        if (normalized.includes("dry van")) return "DRY_VAN";
        if (normalized.includes("reefer") || normalized.includes("refrigerated")) return "REEFER";
        if (normalized.includes("flatbed")) return "FLATBED";
        if (normalized.includes("stepdeck") || normalized.includes("step deck")) return "STEPDECK";
        if (normalized.includes("power only")) return "POWER_ONLY";

        return "OTHER";
    }
}