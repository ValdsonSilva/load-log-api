import { z } from "zod";

export const expenseTypeSchema = z.enum([
    "FUEL",
    "TOLL",
    "PARKING",
    "MAINTENANCE",
    "LUMPER",
    "SCALE",
    "WASHOUT",
    "FOOD",
    "DETENTION",
    "LAYOVER",
    "TONU",
    "OTHER",
]);

export const listExpensesSchema = z.object({
    query: z.object({
        loadId: z.string().optional(),
        type: expenseTypeSchema.optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
    }),
});

export const createExpenseSchema = z.object({
    body: z.object({
        loadId: z.string().min(1, "loadId is required"),
        type: expenseTypeSchema,
        amount: z.coerce.number().positive(),
        currency: z.string().trim().min(3).max(3).default("USD"),
        vendor: z.string().trim().optional().nullable(),
        location: z.string().trim().optional().nullable(),
        expenseDate: z.coerce.date(),
        notes: z.string().trim().optional().nullable(),
    }),
});

export const updateExpenseSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
    body: z.object({
        loadId: z.string().min(1).optional(),
        type: expenseTypeSchema.optional(),
        amount: z.coerce.number().positive().optional(),
        currency: z.string().trim().min(3).max(3).optional(),
        vendor: z.string().trim().optional().nullable(),
        location: z.string().trim().optional().nullable(),
        expenseDate: z.coerce.date().optional(),
        notes: z.string().trim().optional().nullable(),
    }),
});

export const deleteExpenseSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
});