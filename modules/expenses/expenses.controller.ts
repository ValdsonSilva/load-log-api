import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import {
    createExpenseSchema,
    deleteExpenseSchema,
    listExpensesSchema,
    updateExpenseSchema,
} from "./expenses.schema.js";
import { ExpensesService } from "./expenses.service.js";

const service = new ExpensesService();

function getUserId(req: any) {
    const userId = req.auth?.userId;

    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    return userId;
}

export const listExpenses: RequestHandler = async (req: any, res) => {
    try {
        const userId = getUserId(req);

        console.log("GET /expenses auth userId:", userId);
        console.log("GET /expenses query:", req.query);

        const { query } = listExpensesSchema.parse({
            query: req.query,
        });

        const result = await service.list({
            driverId: userId,
            loadId: query.loadId,
            type: query.type,
            from: query.from,
            to: query.to,
        });

        return res.json(result);
    } catch (err: any) {
        console.error("GET /expenses ERROR:", {
            name: err?.name,
            message: err?.message,
            code: err?.code,
            meta: err?.meta,
            stack: err?.stack,
        });

        return res.status(500).json({
            error: err?.message || "Failed to list expenses",
            code: err?.code ?? null,
            meta: err?.meta ?? null,
        });
    }
};

export const createExpense: RequestHandler = async (req: any, res) => {
    const userId = getUserId(req);

    const { body } = createExpenseSchema.parse({
        body: req.body,
    });

    const result = await service.create({
        driverId: userId,
        loadId: body.loadId,
        type: body.type,
        amount: body.amount,
        currency: body.currency,
        vendor: body.vendor,
        location: body.location,
        expenseDate: body.expenseDate,
        notes: body.notes,
    });

    res.status(201).json(result);
};

export const updateExpense: RequestHandler = async (req: any, res) => {
    const userId = getUserId(req);

    const { params, body } = updateExpenseSchema.parse({
        params: req.params,
        body: req.body,
    });

    const result = await service.update({
        driverId: userId,
        id: params.id,
        loadId: body.loadId,
        type: body.type,
        amount: body.amount,
        currency: body.currency,
        vendor: body.vendor,
        location: body.location,
        expenseDate: body.expenseDate,
        notes: body.notes,
    });

    res.json(result);
};

export const deleteExpense: RequestHandler = async (req: any, res) => {
    const userId = getUserId(req);

    const { params } = deleteExpenseSchema.parse({
        params: req.params,
    });

    const result = await service.delete({
        userId,
        id: params.id,
    });

    res.json(result);
};