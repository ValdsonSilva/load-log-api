import { z } from "zod";

export const CreateAttachmentMetaSchema = z.object({
  type: z.enum([
    "RATE_CONFIRMATION",
    "BOL_PHOTO",
    "POD",
    "SIGNED_BOL",
    "LUMPER_RECEIPT",
    "SCALE_TICKET",
    "FUEL_RECEIPT",
    "OTHER",
  ]).default("BOL_PHOTO"),
});
