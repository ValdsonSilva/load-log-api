import { z } from "zod";

export const CreateTimelineEventSchema = z.object({
    type: z.enum([
        "ARRIVED_AT_SHIPPER", 
        "CHECKED_IN",
        "DOOR_ASSIGNED",
        "LOAD_START",
        "LOAD_END",
        "LEFT_SHIPPER",
        "SCALE_STOP",
        "ARRIVED_AT_RECEIVER",
        "UNLOAD_START",
        "UNLOAD_END",
        "LEFT_RECEIVER",
        "LOAD_COMPLETED",
        "DELAY_TRAFFIC",
        "DELAY_WEATHER",
        "DELAY_ACCIDENT",
        "NOTE",
        "OTHER",
    ]),
    source: z.enum(["MANUAL", "AUTO_GPS", "IMPORTED"]).default("MANUAL"),

    occurredAtUtc: z.coerce.date().optional(), // default: now, format: ISO string or timestamp
    timeZone: z.string().min(1).default("UTC"),

    latitude: z.number().optional(),
    longitude: z.number().optional(),
    locationText: z.string().optional(),

    notes: z.string().optional(),
    metadata: z.unknown().optional(),
});

export const UpdateTimelineEventSchema = CreateTimelineEventSchema.partial();