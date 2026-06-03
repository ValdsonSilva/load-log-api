import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { AdminService } from "./admin.service.js";

const service = new AdminService();

function getActorId(req: any) {
    const actorId = req.auth?.userId;

    if (!actorId) {
        throw new AppError(401, "Unauthorized");
    }

    return actorId;
}

function queryString(value: unknown) {
    return value === undefined ? undefined : String(value);
}

function queryNumber(value: unknown) {
    return value === undefined ? undefined : Number(value);
}

function queryBoolean(value: unknown) {
    if (value === undefined) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

export const getDashboardSummary: RequestHandler = async (_req, res) => {
    const result = await service.getDashboardSummary();
    return res.json(result);
};

export const getDashboardActivity: RequestHandler = async (_req, res) => {
    const result = await service.getDashboardActivity();
    return res.json(result);
};

export const listUsers: RequestHandler = async (req, res) => {
    const result = await service.listUsers({
        page: queryNumber(req.query.page),
        limit: queryNumber(req.query.limit),
        search: queryString(req.query.search),
        role: queryString(req.query.role),
        isActive: queryBoolean(req.query.isActive),
    });

    return res.json(result);
};

export const getUserById: RequestHandler = async (req, res) => {
    const result = await service.getUserById(req.params.id as string);
    return res.json(result);
};

export const updateUserStatus: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.updateUserStatus(
        actorId,
        req.params.id as string,
        req.body
    );

    return res.json(result);
};

export const updateUserRole: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.updateUserRole(
        actorId,
        req.params.id as string,
        req.body
    );

    return res.json(result);
};

export const listLoads: RequestHandler = async (req, res) => {
    const result = await service.listLoads({
        page: queryNumber(req.query.page),
        limit: queryNumber(req.query.limit),
        search: queryString(req.query.search),
        status: queryString(req.query.status),
        dateFrom: queryString(req.query.dateFrom),
        dateTo: queryString(req.query.dateTo),
        sortBy: queryString(req.query.sortBy),
        sortOrder: queryString(req.query.sortOrder),
    });

    return res.json(result);
};

export const getLoadById: RequestHandler = async (req, res) => {
    const result = await service.getLoadById(req.params.id as string);
    return res.json(result);
};

export const updateLoadStatus: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.updateLoadStatus(
        actorId,
        req.params.id as string,
        req.body
    );

    return res.json(result);
};

export const listLoadEvents: RequestHandler = async (req, res) => {
    const result = await service.listLoadEvents(req.params.id as string);
    return res.json(result);
};

export const updateLoadEvent: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.updateLoadEvent(
        actorId,
        req.params.id as string,
        req.params.eventId as string,
        req.body
    );

    return res.json(result);
};

export const deleteLoadEvent: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.deleteLoadEvent(
        actorId,
        req.params.id as string,
        req.params.eventId as string,
        req.body
    );

    return res.json(result);
};

export const listLoadDocuments: RequestHandler = async (req, res) => {
    const result = await service.listLoadDocuments(req.params.id as string);
    return res.json(result);
};

export const getDocumentById: RequestHandler = async (req, res) => {
    const result = await service.getDocumentById(req.params.id as string);
    return res.json(result);
};

export const deleteDocument: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.deleteDocument(
        actorId,
        req.params.id as string,
        req.body
    );

    return res.json(result);
};

export const listLoadExpenses: RequestHandler = async (req, res) => {
    const result = await service.listLoadExpenses(req.params.id as string);
    return res.json(result);
};

export const createLoadExpense: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.createLoadExpense(
        actorId,
        req.params.id as string,
        req.body
    );

    return res.status(201).json(result);
};

export const updateLoadExpense: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.updateLoadExpense(
        actorId,
        req.params.id as string,
        req.params.expenseId as string,
        req.body
    );

    return res.json(result);
};

export const deleteLoadExpense: RequestHandler = async (req, res) => {
    const actorId = getActorId(req);

    const result = await service.deleteLoadExpense(
        actorId,
        req.params.id as string,
        req.params.expenseId as string,
        req.body
    );

    return res.json(result);
};

export const listAuditLogs: RequestHandler = async (req, res) => {
    const result = await service.listAuditLogs({
        page: queryNumber(req.query.page),
        limit: queryNumber(req.query.limit),
        action: queryString(req.query.action),
        targetType: queryString(req.query.targetType),
        targetId: queryString(req.query.targetId),
        dateFrom: queryString(req.query.dateFrom),
        dateTo: queryString(req.query.dateTo),
    });

    return res.json(result);
};

export const getAuditLogById: RequestHandler = async (req, res) => {
    const result = await service.getAuditLogById(req.params.id as string);
    return res.json(result);
};