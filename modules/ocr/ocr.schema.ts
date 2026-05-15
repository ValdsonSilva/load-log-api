import { z } from "zod";

export const ParseLoadDocumentBodySchema = z.object({
    rawText: z.string().min(20).optional(),
    documentType: z
        .enum(["RATE_CONFIRMATION", "BOL", "DISPATCH_SHEET", "OTHER"])
        .default("OTHER"),
});

export const LoadDraftTopLevelKeys = [
    "loadNumber",
    "proNumber",
    "bolNumber",
    "bookingRefNumber",
    "trailerNumber",
    "containerNumber",
    "sealNumber",
    "commodityDesc",
    "pickupNumber",
    "poNumber",

    "expectedPickupCity",
    "expectedPickupState",
    "expectedDeliveryCity",
    "expectedDeliveryState",

    "brokerCompanyName",
    "brokerMcNumber",
    "brokerPhone",
    "brokerEmail",
    "brokerAgentName",
    "brokerAgentPhone",
    "brokerAgentEmail",

    "dispatcherName",
    "dispatcherCompanyName",
    "dispatcherPhone",
    "dispatcherEmail",

    "carrierCompanyName",
    "carrierMcNumber",
    "carrierDotNumber",
    "carrierMainPhone",
] as const;

export const RateAgreementKeys = [
    "rateAmount",
    "rateType",
    "quotedMiles",
    "paymentMethod",
    "quickPayFee",
    "detentionStartsAfterHours",
    "detentionRatePerHour",
    "detentionMaxCap",
    "layoverTermsText",
    "tonuTermsText",
    "notes",
] as const;

export const EquipmentSpecKeys = [
    "trailerType",
    "temperatureSetpointF",
    "temperatureMinF",
    "temperatureMaxF",
    "weightLbs",
    "palletCount",
    "pieceCount",
    "hazmat",
    "highValue",
    "sealRequired",
    "securementRequired",
    "securementMethods",
] as const;

export type ConfidenceLevel = "high" | "medium" | "low" | "missing";

export type LoadDraftResponse = {
    status: "needs_review";
    confidence: number;
    draft: {
        loadNumber: string | null;
        proNumber: string | null;
        bolNumber: string | null;
        bookingRefNumber: string | null;
        trailerNumber: string | null;
        containerNumber: string | null;
        sealNumber: string | null;
        commodityDesc: string | null;
        pickupNumber: string | null;
        poNumber: string | null;

        expectedPickupCity: string | null;
        expectedPickupState: string | null;
        expectedDeliveryCity: string | null;
        expectedDeliveryState: string | null;

        brokerCompanyName: string | null;
        brokerMcNumber: string | null;
        brokerPhone: string | null;
        brokerEmail: string | null;
        brokerAgentName: string | null;
        brokerAgentPhone: string | null;
        brokerAgentEmail: string | null;

        dispatcherName: string | null;
        dispatcherCompanyName: string | null;
        dispatcherPhone: string | null;
        dispatcherEmail: string | null;

        carrierCompanyName: string | null;
        carrierMcNumber: string | null;
        carrierDotNumber: string | null;
        carrierMainPhone: string | null;

        rateAgreement: {
            rateAmount: number | null;
            rateType: "FLAT" | "PER_MILE" | "OTHER" | null;
            quotedMiles: number | null;
            paymentMethod: string | null;
            quickPayFee: number | null;
            detentionStartsAfterHours: number | null;
            detentionRatePerHour: number | null;
            detentionMaxCap: number | null;
            layoverTermsText: string | null;
            tonuTermsText: string | null;
            notes: string | null;
        };

        equipmentSpec: {
            trailerType:
            | "DRY_VAN"
            | "REEFER"
            | "FLATBED"
            | "STEPDECK"
            | "POWER_ONLY"
            | "OTHER"
            | null;
            temperatureSetpointF: number | null;
            temperatureMinF: number | null;
            temperatureMaxF: number | null;
            weightLbs: number | null;
            palletCount: number | null;
            pieceCount: number | null;
            hazmat: boolean | null;
            highValue: boolean | null;
            sealRequired: boolean | null;
            securementRequired: boolean | null;
            securementMethods: string[];
        };
    };
    fieldConfidence: Record<string, ConfidenceLevel>;
    missingFields: string[];
    warnings: string[];
};