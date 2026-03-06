import { z } from "zod";

export const CreateDisputeSchema = z.object({
    disputeType: z.enum([
        "DETENTION",
        "LUMPER",
        "TONU",
        "RATE_MISMATCH",
        "TRACKING_PENALTY",
        "OTHER",
    ]),
    amountClaimed: z.coerce.number().nonnegative(),
    resolutionNotes: z.string().optional(),
});

export const UpdateDisputeSchema = z.object({
    disputeType: z
        .enum(["DETENTION", "LUMPER", "TONU", "RATE_MISMATCH", "TRACKING_PENALTY", "OTHER"])
        .optional(),
    amountClaimed: z.coerce.number().nonnegative().optional(),
    status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]).optional(),
    resolutionNotes: z.string().nullable().optional(),
});

export const AddEvidenceSchema = z.object({
    attachmentId: z.string(),
});
