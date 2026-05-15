import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
    createExpense,
    deleteExpense,
    listExpenses,
    updateExpense,
} from "./expenses.controller.js";

export const expensesRoutes = Router();

expensesRoutes.use(requireAuth);

expensesRoutes.get("/", listExpenses);
expensesRoutes.post("/", createExpense);
expensesRoutes.patch("/:id", updateExpense);
expensesRoutes.delete("/:id", deleteExpense);