import { z } from "zod";

const nullableString = z.preprocess(
    (value) => value === "" ? null : value,
    z.string().trim().nullable().optional()
);

const optionalString = z.string().trim().min(1).optional();

const nullableNumber = z.preprocess(
    (value) => value === "" ? null : value,
    z.coerce.number().nullable().optional()
);

const nullableInt = z.preprocess(
    (value) => value === "" ? null : value,
    z.coerce.number().int().nullable().optional()
);

export const loadTypeSchema = z.enum([
    "DRY_VAN",
    "REEFER",
    "FLATBED",
    "STEPDECK",
    "POWER_ONLY",
    "OTHER",
]);

export const loadModeSchema = z.enum([
    "LIVE_LIVE",
    "LIVE_DROP",
    "DROP_LIVE",
    "DROP_DROP",
]);

export const driverOperatingAsSchema = z.enum([
    "OWNER_OPERATOR_OWN_AUTHORITY",
    "COMPANY_DRIVER_UNDER_AUTHORITY",
    "LEASED_ON_UNDER_COMPANY_AUTHORITY",
]);

export const rateTypeSchema = z.enum([
    "FLAT",
    "PER_MILE",
    "OTHER",
]);

export const paymentMethodSchema = z.enum([
    "FACTORING",
    "QUICK_PAY",
    "STANDARD",
]);

export const updateLoadBaseDetailsSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),

    body: z.object({
        reason: nullableString,

        driverOperatingAs: driverOperatingAsSchema.optional(),

        loadNumber: optionalString,
        proNumber: nullableString,
        bolNumber: nullableString,
        bookingRefNumber: nullableString,
        trailerNumber: nullableString,
        containerNumber: nullableString,
        sealNumber: nullableString,
        commodityDesc: nullableString,

        pickupNumber: nullableString,
        poNumber: nullableString,

        loadType: loadTypeSchema.optional(),
        mode: loadModeSchema.optional(),

        expectedPickupCity: nullableString,
        expectedPickupState: nullableString,
        expectedDeliveryCity: nullableString,
        expectedDeliveryState: nullableString,

        brokerCompanyName: optionalString,
        brokerMcNumber: nullableString,
        brokerPhone: nullableString,
        brokerEmail: nullableString,
        brokerAgentName: nullableString,
        brokerAgentPhone: nullableString,
        brokerAgentEmail: nullableString,

        dispatcherName: nullableString,
        dispatcherCompanyName: nullableString,
        dispatcherPhone: nullableString,
        dispatcherEmail: nullableString,

        carrierCompanyName: nullableString,
        carrierMcNumber: nullableString,
        carrierDotNumber: nullableString,
        carrierMainPhone: nullableString,

        rateAgreement: z.object({
            rateAmount: z.coerce.number().positive().optional(),
            rateType: rateTypeSchema.optional(),
            quotedMiles: nullableInt,
            paymentMethod: paymentMethodSchema.optional(),
            quickPayFee: nullableNumber,
            detentionStartsAfterHours: nullableInt,
            detentionRatePerHour: nullableNumber,
            detentionMaxCap: nullableNumber,
            layoverTermsText: nullableString,
            tonuTermsText: nullableString,
            notes: nullableString,
        }).optional(),

        equipmentSpec: z.object({
            trailerType: loadTypeSchema.optional(),
            temperatureSetpointF: nullableNumber,
            temperatureMinF: nullableNumber,
            temperatureMaxF: nullableNumber,
            weightLbs: nullableNumber,
            palletCount: nullableInt,
            pieceCount: nullableInt,
            hazmat: z.boolean().optional(),
            highValue: z.boolean().optional(),
            sealRequired: z.boolean().optional(),
            securementRequired: z.boolean().optional(),
            securementMethods: z.array(z.string().trim().min(1)).optional(),
        }).optional(),
    }),
});

export const listLoadBaseDetailsRevisionsSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
});