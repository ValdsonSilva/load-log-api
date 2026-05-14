import { z } from "zod";

export const ParseLoadDocumentBodySchema = z.object({
    rawText: z.string().min(20).optional(),
    documentType: z
        .enum(["RATE_CONFIRMATION", "BOL", "DISPATCH_SHEET", "OTHER"])
        .default("OTHER"),
});

export const LoadDraftJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "status",
        "confidence",
        "draft",
        "fieldConfidence",
        "missingFields",
        "warnings",
    ],
    properties: {
        status: {
            type: "string",
            enum: ["needs_review"],
        },
        confidence: {
            type: "number",
        },
        draft: {
            type: "object",
            additionalProperties: false,
            required: [
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
            ],
            properties: {
                loadNumber: { type: ["string", "null"] },
                brokerCompanyName: { type: ["string", "null"] },
                pickupLocation: { type: ["string", "null"] },
                pickupDate: { type: ["string", "null"] },
                pickupTime: { type: ["string", "null"] },
                deliveryLocation: { type: ["string", "null"] },
                deliveryDate: { type: ["string", "null"] },
                deliveryTime: { type: ["string", "null"] },
                rateAmount: { type: ["number", "null"] },
                commodity: { type: ["string", "null"] },
                weightLbs: { type: ["number", "null"] },
                equipmentType: { type: ["string", "null"] },
                specialInstructions: { type: ["string", "null"] },
            },
        },
        fieldConfidence: {
            type: "object",
            additionalProperties: false,
            required: [
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
            ],
            properties: {
                loadNumber: { type: "string", enum: ["high", "medium", "low", "missing"] },
                brokerCompanyName: { type: "string", enum: ["high", "medium", "low", "missing"] },
                pickupLocation: { type: "string", enum: ["high", "medium", "low", "missing"] },
                pickupDate: { type: "string", enum: ["high", "medium", "low", "missing"] },
                pickupTime: { type: "string", enum: ["high", "medium", "low", "missing"] },
                deliveryLocation: { type: "string", enum: ["high", "medium", "low", "missing"] },
                deliveryDate: { type: "string", enum: ["high", "medium", "low", "missing"] },
                deliveryTime: { type: "string", enum: ["high", "medium", "low", "missing"] },
                rateAmount: { type: "string", enum: ["high", "medium", "low", "missing"] },
                commodity: { type: "string", enum: ["high", "medium", "low", "missing"] },
                weightLbs: { type: "string", enum: ["high", "medium", "low", "missing"] },
                equipmentType: { type: "string", enum: ["high", "medium", "low", "missing"] },
                specialInstructions: { type: "string", enum: ["high", "medium", "low", "missing"] },
            },
        },
        missingFields: {
            type: "array",
            items: { type: "string" },
        },
        warnings: {
            type: "array",
            items: { type: "string" },
        },
    },
} as const;