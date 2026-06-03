import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireAdmin } from "../../middlewares/requireAdmin.js";
import {
    createLoadExpense,
    deleteDocument,
    deleteLoadEvent,
    deleteLoadExpense,
    getAuditLogById,
    getDashboardActivity,
    getDashboardSummary,
    getDocumentById,
    getLoadById,
    getUserById,
    listAuditLogs,
    listLoadDocuments,
    listLoadEvents,
    listLoadExpenses,
    listLoads,
    listUsers,
    updateLoadEvent,
    updateLoadExpense,
    updateLoadStatus,
    updateUserRole,
    updateUserStatus,
} from "./admin.controller.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.use(requireAdmin);

adminRoutes.get("/dashboard/summary", getDashboardSummary);
adminRoutes.get("/dashboard/activity", getDashboardActivity);

adminRoutes.get("/users", listUsers);
adminRoutes.get("/users/:id", getUserById);
adminRoutes.patch("/users/:id/status", updateUserStatus);
adminRoutes.patch("/users/:id/role", updateUserRole);

adminRoutes.get("/loads", listLoads);
adminRoutes.get("/loads/:id", getLoadById);
adminRoutes.patch("/loads/:id/status", updateLoadStatus);

adminRoutes.get("/loads/:id/events", listLoadEvents);
adminRoutes.patch("/loads/:id/events/:eventId", updateLoadEvent);
adminRoutes.delete("/loads/:id/events/:eventId", deleteLoadEvent);

adminRoutes.get("/loads/:id/documents", listLoadDocuments);
adminRoutes.get("/documents/:id", getDocumentById);
adminRoutes.delete("/documents/:id", deleteDocument);

adminRoutes.get("/loads/:id/expenses", listLoadExpenses);
adminRoutes.post("/loads/:id/expenses", createLoadExpense);
adminRoutes.patch("/loads/:id/expenses/:expenseId", updateLoadExpense);
adminRoutes.delete("/loads/:id/expenses/:expenseId", deleteLoadExpense);

adminRoutes.get("/audit-logs", listAuditLogs);
adminRoutes.get("/audit-logs/:id", getAuditLogById);