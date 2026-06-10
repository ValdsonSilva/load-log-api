import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { DispatcherService } from "./dispatcher.service.js";

const service = new DispatcherService();

function getUserId(req: any) {
    const userId = req.auth?.userId;

    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    return userId;
}

export const getDispatcherProfile: RequestHandler = async (req, res) => {
    const result = await service.getProfile(getUserId(req));
    return res.json(result);
};

export const upsertDispatcherProfile: RequestHandler = async (req, res) => {
    const result = await service.upsertProfile(getUserId(req), req.body);
    return res.json(result);
};

export const inviteDriver: RequestHandler = async (req, res) => {
    const result = await service.inviteDriver(getUserId(req), req.body);
    return res.status(201).json(result);
};

export const listDispatcherConnections: RequestHandler = async (req, res) => {
    const result = await service.listDispatcherConnections(getUserId(req));
    return res.json(result);
};

export const cancelConnection: RequestHandler = async (req, res) => {
    const result = await service.cancelConnection(
        getUserId(req),
        req.params.id as string
    );

    return res.json(result);
};

export const revokeConnection: RequestHandler = async (req, res) => {
    const result = await service.revokeConnection(
        getUserId(req),
        req.params.id as string
    );

    return res.json(result);
};

export const listDriverInvites: RequestHandler = async (req, res) => {
    const result = await service.listDriverInvites(getUserId(req));
    return res.json(result);
};

export const acceptDriverInvite: RequestHandler = async (req, res) => {
    const result = await service.acceptInvite(getUserId(req), req.params.id as string);
    return res.json(result);
};

export const rejectDriverInvite: RequestHandler = async (req, res) => {
    const result = await service.rejectInvite(getUserId(req), req.params.id as string);
    return res.json(result);
};