import { z } from "zod";

export const CreateStopSchema = z.object({
    type: z.enum(["PICKUP", "DELIVERY", "STOP_OFF"]),
    sequence: z.number().int().positive().optional(), // se não vier, auto-incrementa

    facilityName: z.string().min(1),
    phone: z.string().optional(),

    street1: z.string().min(1),
    street2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().default("US"),

    appointmentType: z.enum(["FCFS", "APPOINTMENT_REQUIRED", "UNKNOWN"]).default("UNKNOWN"),
    appointmentAt: z.coerce.date().optional(),
    operatingHoursText: z.string().optional(),
    checkInInstructions: z.string().optional(),

    dockDoorInfo: z.string().optional(),

    lumperRequired: z.boolean().default(false),
    ppeRequired: z.boolean().default(false),
    idRequired: z.boolean().default(false),
    guardShackCheckIn: z.boolean().default(false),
    specialInstructions: z.string().optional(),

    handlingType: z.enum(["LIVE_LOAD", "LIVE_UNLOAD", "DROP_HOOK", "UNKNOWN"]).default("UNKNOWN"),
});

export const UpdateStopSchema = CreateStopSchema.partial();
