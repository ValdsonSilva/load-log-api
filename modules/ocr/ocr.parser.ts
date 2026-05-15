import OpenAI from "openai";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/error.js";
import {
    EquipmentSpecKeys,
    LoadDraftTopLevelKeys,
    RateAgreementKeys,
    type ConfidenceLevel,
    type LoadDraftResponse,
} from "./ocr.schema.js";

export class LoadDocumentParser {
    private client = new OpenAI({
        apiKey: env.AI_API_KEY,
        baseURL: env.AI_BASE_URL,
    });

    async parseLoadText(params: {
        text: string;
        documentType: string;
    }): Promise<LoadDraftResponse> {
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
- This is a draft for driver review, not a final load.
- Dates should be ISO date strings when possible, like 2026-05-10.
- Times should use 24-hour format when possible, like 08:00.
- Convert money to number.
- Convert weight to pounds when clearly stated.
- Do not return pickupAddress, pickupZip, deliveryAddress, or deliveryZip.
- For pickup and delivery, return only city and state in expectedPickupCity, expectedPickupState, expectedDeliveryCity, expectedDeliveryState.
- Put commodity inside draft.commodityDesc.
- Put rate, miles, payment, detention, layover, TONU, and financial notes inside draft.rateAgreement.
- Put trailer type, temperature, weight, pallets, pieces, hazmat, high value, seal, and securement data inside draft.equipmentSpec.
- Normalize trailerType to one of: DRY_VAN, REEFER, FLATBED, STEPDECK, POWER_ONLY, OTHER.
- Normalize rateType to one of: FLAT, PER_MILE, OTHER.
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
    "proNumber": null,
    "bolNumber": null,
    "bookingRefNumber": null,
    "trailerNumber": null,
    "containerNumber": null,
    "sealNumber": null,
    "commodityDesc": null,
    "pickupNumber": null,
    "poNumber": null,

    "expectedPickupCity": null,
    "expectedPickupState": null,
    "expectedDeliveryCity": null,
    "expectedDeliveryState": null,

    "brokerCompanyName": null,
    "brokerMcNumber": null,
    "brokerPhone": null,
    "brokerEmail": null,
    "brokerAgentName": null,
    "brokerAgentPhone": null,
    "brokerAgentEmail": null,

    "dispatcherName": null,
    "dispatcherCompanyName": null,
    "dispatcherPhone": null,
    "dispatcherEmail": null,

    "carrierCompanyName": null,
    "carrierMcNumber": null,
    "carrierDotNumber": null,
    "carrierMainPhone": null,

    "rateAgreement": {
      "rateAmount": null,
      "rateType": null,
      "quotedMiles": null,
      "paymentMethod": null,
      "quickPayFee": null,
      "detentionStartsAfterHours": null,
      "detentionRatePerHour": null,
      "detentionMaxCap": null,
      "layoverTermsText": null,
      "tonuTermsText": null,
      "notes": null
    },

    "equipmentSpec": {
      "trailerType": null,
      "temperatureSetpointF": null,
      "temperatureMinF": null,
      "temperatureMaxF": null,
      "weightLbs": null,
      "palletCount": null,
      "pieceCount": null,
      "hazmat": null,
      "highValue": null,
      "sealRequired": null,
      "securementRequired": null,
      "securementMethods": []
    }
  },
  "fieldConfidence": {},
  "missingFields": [],
  "warnings": []
}

Allowed fieldConfidence values:
"high", "medium", "low", "missing"

Use dot notation for nested confidence keys, for example:
"rateAgreement.rateAmount": "high"
"equipmentSpec.trailerType": "medium"

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

    private normalizeParsedDraft(parsed: any): LoadDraftResponse {
        const sourceDraft = parsed?.draft ?? {};

        const draft: LoadDraftResponse["draft"] = {
            loadNumber: this.normalizeString(sourceDraft.loadNumber),
            proNumber: this.normalizeString(sourceDraft.proNumber),
            bolNumber: this.normalizeString(sourceDraft.bolNumber),
            bookingRefNumber: this.normalizeString(sourceDraft.bookingRefNumber),
            trailerNumber: this.normalizeString(sourceDraft.trailerNumber),
            containerNumber: this.normalizeString(sourceDraft.containerNumber),
            sealNumber: this.normalizeString(sourceDraft.sealNumber),
            commodityDesc: this.normalizeString(
                sourceDraft.commodityDesc ?? sourceDraft.commodity
            ),
            pickupNumber: this.normalizeString(sourceDraft.pickupNumber),
            poNumber: this.normalizeString(sourceDraft.poNumber),

            expectedPickupCity: this.normalizeString(sourceDraft.expectedPickupCity),
            expectedPickupState: this.normalizeState(sourceDraft.expectedPickupState),
            expectedDeliveryCity: this.normalizeString(sourceDraft.expectedDeliveryCity),
            expectedDeliveryState: this.normalizeState(sourceDraft.expectedDeliveryState),

            brokerCompanyName: this.normalizeString(sourceDraft.brokerCompanyName),
            brokerMcNumber: this.normalizeString(sourceDraft.brokerMcNumber),
            brokerPhone: this.normalizeString(sourceDraft.brokerPhone),
            brokerEmail: this.normalizeString(sourceDraft.brokerEmail),
            brokerAgentName: this.normalizeString(sourceDraft.brokerAgentName),
            brokerAgentPhone: this.normalizeString(sourceDraft.brokerAgentPhone),
            brokerAgentEmail: this.normalizeString(sourceDraft.brokerAgentEmail),

            dispatcherName: this.normalizeString(sourceDraft.dispatcherName),
            dispatcherCompanyName: this.normalizeString(sourceDraft.dispatcherCompanyName),
            dispatcherPhone: this.normalizeString(sourceDraft.dispatcherPhone),
            dispatcherEmail: this.normalizeString(sourceDraft.dispatcherEmail),

            carrierCompanyName: this.normalizeString(sourceDraft.carrierCompanyName),
            carrierMcNumber: this.normalizeString(sourceDraft.carrierMcNumber),
            carrierDotNumber: this.normalizeString(sourceDraft.carrierDotNumber),
            carrierMainPhone: this.normalizeString(sourceDraft.carrierMainPhone),

            rateAgreement: {
                rateAmount: this.normalizeNumber(
                    sourceDraft.rateAgreement?.rateAmount ?? sourceDraft.rateAmount
                ),
                rateType: this.normalizeRateType(sourceDraft.rateAgreement?.rateType),
                quotedMiles: this.normalizeNumber(sourceDraft.rateAgreement?.quotedMiles),
                paymentMethod: this.normalizeString(sourceDraft.rateAgreement?.paymentMethod),
                quickPayFee: this.normalizeNumber(sourceDraft.rateAgreement?.quickPayFee),
                detentionStartsAfterHours: this.normalizeNumber(
                    sourceDraft.rateAgreement?.detentionStartsAfterHours
                ),
                detentionRatePerHour: this.normalizeNumber(
                    sourceDraft.rateAgreement?.detentionRatePerHour
                ),
                detentionMaxCap: this.normalizeNumber(
                    sourceDraft.rateAgreement?.detentionMaxCap
                ),
                layoverTermsText: this.normalizeString(
                    sourceDraft.rateAgreement?.layoverTermsText
                ),
                tonuTermsText: this.normalizeString(sourceDraft.rateAgreement?.tonuTermsText),
                notes: this.normalizeString(
                    sourceDraft.rateAgreement?.notes ?? sourceDraft.specialInstructions
                ),
            },

            equipmentSpec: {
                trailerType: this.normalizeTrailerType(
                    sourceDraft.equipmentSpec?.trailerType ?? sourceDraft.equipmentType
                ),
                temperatureSetpointF: this.normalizeNumber(
                    sourceDraft.equipmentSpec?.temperatureSetpointF
                ),
                temperatureMinF: this.normalizeNumber(
                    sourceDraft.equipmentSpec?.temperatureMinF
                ),
                temperatureMaxF: this.normalizeNumber(
                    sourceDraft.equipmentSpec?.temperatureMaxF
                ),
                weightLbs: this.normalizeNumber(
                    sourceDraft.equipmentSpec?.weightLbs ?? sourceDraft.weightLbs
                ),
                palletCount: this.normalizeNumber(sourceDraft.equipmentSpec?.palletCount),
                pieceCount: this.normalizeNumber(sourceDraft.equipmentSpec?.pieceCount),
                hazmat: this.normalizeBoolean(sourceDraft.equipmentSpec?.hazmat),
                highValue: this.normalizeBoolean(sourceDraft.equipmentSpec?.highValue),
                sealRequired: this.normalizeBoolean(sourceDraft.equipmentSpec?.sealRequired),
                securementRequired: this.normalizeBoolean(
                    sourceDraft.equipmentSpec?.securementRequired
                ),
                securementMethods: this.normalizeStringArray(
                    sourceDraft.equipmentSpec?.securementMethods
                ),
            },
        };

        const fieldConfidence = this.buildFieldConfidence(parsed?.fieldConfidence, draft);
        const missingFields = this.buildMissingFields(parsed?.missingFields, draft);
        const warnings = Array.isArray(parsed?.warnings)
            ? parsed.warnings.filter((item: unknown) => typeof item === "string")
            : [];

        return {
            status: "needs_review",
            confidence:
                typeof parsed?.confidence === "number"
                    ? Math.max(0, Math.min(1, parsed.confidence))
                    : 0.5,
            draft,
            fieldConfidence,
            missingFields,
            warnings,
        };
    }

    private buildFieldConfidence(
        rawConfidence: any,
        draft: LoadDraftResponse["draft"]
    ): Record<string, ConfidenceLevel> {
        const result: Record<string, ConfidenceLevel> = {};

        for (const key of LoadDraftTopLevelKeys) {
            const value = draft[key];
            result[key] = this.normalizeConfidence(rawConfidence?.[key], value);
        }

        for (const key of RateAgreementKeys) {
            const path = `rateAgreement.${key}`;
            const value = draft.rateAgreement[key];
            result[path] = this.normalizeConfidence(rawConfidence?.[path], value);
        }

        for (const key of EquipmentSpecKeys) {
            const path = `equipmentSpec.${key}`;
            const value = draft.equipmentSpec[key];
            result[path] = this.normalizeConfidence(rawConfidence?.[path], value);
        }

        return result;
    }

    private buildMissingFields(
        rawMissingFields: any,
        draft: LoadDraftResponse["draft"]
    ) {
        const missing = new Set<string>();

        if (Array.isArray(rawMissingFields)) {
            for (const item of rawMissingFields) {
                if (typeof item === "string" && item.trim()) {
                    missing.add(item.trim());
                }
            }
        }

        const importantFields: Array<[string, unknown]> = [
            ["loadNumber", draft.loadNumber],
            ["brokerCompanyName", draft.brokerCompanyName],
            ["commodityDesc", draft.commodityDesc],
            ["expectedPickupCity", draft.expectedPickupCity],
            ["expectedPickupState", draft.expectedPickupState],
            ["expectedDeliveryCity", draft.expectedDeliveryCity],
            ["expectedDeliveryState", draft.expectedDeliveryState],
            ["rateAgreement.rateAmount", draft.rateAgreement.rateAmount],
            ["equipmentSpec.trailerType", draft.equipmentSpec.trailerType],
            ["equipmentSpec.weightLbs", draft.equipmentSpec.weightLbs],
        ];

        for (const [path, value] of importantFields) {
            if (this.isMissing(value)) {
                missing.add(path);
            }
        }

        return Array.from(missing);
    }

    private normalizeConfidence(value: unknown, fieldValue: unknown): ConfidenceLevel {
        if (
            value === "high" ||
            value === "medium" ||
            value === "low" ||
            value === "missing"
        ) {
            return value;
        }

        return this.isMissing(fieldValue) ? "missing" : "medium";
    }

    private normalizeString(value: unknown) {
        if (typeof value !== "string") return null;

        const trimmed = value.trim();

        if (!trimmed || trimmed.toLowerCase() === "null") {
            return null;
        }

        return trimmed;
    }

    private normalizeState(value: unknown) {
        const normalized = this.normalizeString(value);

        if (!normalized) return null;

        return normalized.toUpperCase();
    }

    private normalizeNumber(value: unknown) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value !== "string") {
            return null;
        }

        const cleaned = value.replace(/[$,\s]/g, "");
        const parsed = Number(cleaned);

        return Number.isFinite(parsed) ? parsed : null;
    }

    private normalizeBoolean(value: unknown) {
        if (typeof value === "boolean") return value;

        if (typeof value !== "string") return null;

        const normalized = value.trim().toLowerCase();

        if (["true", "yes", "y", "required"].includes(normalized)) {
            return true;
        }

        if (["false", "no", "n", "not required"].includes(normalized)) {
            return false;
        }

        return null;
    }

    private normalizeStringArray(value: unknown) {
        if (!Array.isArray(value)) return [];

        return value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    private normalizeRateType(value: unknown) {
        if (typeof value !== "string") return null;

        const normalized = value.toLowerCase();

        if (normalized.includes("per mile") || normalized.includes("per_mile")) {
            return "PER_MILE";
        }

        if (normalized.includes("flat")) {
            return "FLAT";
        }

        if (["FLAT", "PER_MILE", "OTHER"].includes(value)) {
            return value as "FLAT" | "PER_MILE" | "OTHER";
        }

        return "OTHER";
    }

    private normalizeTrailerType(value: unknown) {
        if (typeof value !== "string") return null;

        const normalized = value.toLowerCase();

        if (normalized.includes("dry van") || normalized.includes("van")) {
            return "DRY_VAN";
        }

        if (normalized.includes("reefer") || normalized.includes("refrigerated")) {
            return "REEFER";
        }

        if (normalized.includes("flatbed") || normalized.includes("flat bed")) {
            return "FLATBED";
        }

        if (normalized.includes("stepdeck") || normalized.includes("step deck")) {
            return "STEPDECK";
        }

        if (normalized.includes("power only")) {
            return "POWER_ONLY";
        }

        if (
            ["DRY_VAN", "REEFER", "FLATBED", "STEPDECK", "POWER_ONLY", "OTHER"].includes(
                value
            )
        ) {
            return value as
                | "DRY_VAN"
                | "REEFER"
                | "FLATBED"
                | "STEPDECK"
                | "POWER_ONLY"
                | "OTHER";
        }

        return "OTHER";
    }

    private isMissing(value: unknown) {
        if (value === null || value === undefined) return true;

        if (typeof value === "string" && !value.trim()) return true;

        if (Array.isArray(value) && value.length === 0) return true;

        return false;
    }
}