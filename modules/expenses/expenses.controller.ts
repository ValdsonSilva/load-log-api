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
    const userId = getUserId(req);

    const { query } = listExpensesSchema.parse({
        query: req.query,
    });

    const result = await service.list({
        userId,
        loadId: query.loadId,
        type: query.type,
        from: query.from,
        to: query.to,
    });

    res.json(result);
};

export const createExpense: RequestHandler = async (req: any, res) => {
    const userId = getUserId(req);

    const { body } = createExpenseSchema.parse({
        body: req.body,
    });

    const result = await service.create({
        userId,
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
        userId,
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