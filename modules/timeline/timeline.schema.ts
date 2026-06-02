import { z } from "zod";
import { TimelineEventSource, TimelineEventType } from "@prisma/client";

export const createTimelineEventSchema = z.object({
    params: z.object({
        loadId: z.string().min(1),
    }),

    body: z.object({
        type: z.enum(TimelineEventType),

        source: z.enum(TimelineEventSource).optional(),

        occurredAtUtc: z.coerce.date().optional(),
        timeZone: z.string().trim().min(1).optional(),

        latitude: z.coerce.number().optional().nullable(),
        longitude: z.coerce.number().optional().nullable(),
        locationText: z.string().trim().optional().nullable(),

        notes: z.string().trim().optional().nullable(),

        metadata: z
            .record(z.string(), z.any())
            .optional()
            .nullable(),

        dockDoorNumber: z
            .string()
            .trim()
            .min(1)
            .max(50)
            .optional(),
    }).superRefine((body, ctx) => {
        if (
            body.type === TimelineEventType.DOOR_ASSIGNED &&
            !body.dockDoorNumber
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["dockDoorNumber"],
                message: "dockDoorNumber is required when type is DOOR_ASSIGNED",
            });
        }
    }),
});