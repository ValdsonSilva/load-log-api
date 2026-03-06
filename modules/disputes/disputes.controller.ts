import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { DisputesService } from "./disputes.service.js";
import { AddEvidenceSchema, CreateDisputeSchema, UpdateDisputeSchema } from "./disputes.schema.js";

const service = new DisputesService();

export const createDispute: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const loadId = req.params.loadId as string

    const input = CreateDisputeSchema.parse(req.body);
    const dispute = await service.createDispute(userId, loadId, input);
    res.status(201).json(dispute);
};

export const listDisputes: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");
    const loadId = req.params.loadId as string

    const list = await service.listDisputes(userId, loadId);
    res.json(list);
};

export const getDispute: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const dispute = await service.getDispute(userId, req.params.disputeId as string);
    res.json(dispute);
};

export const updateDispute: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const input = UpdateDisputeSchema.parse(req.body);
    const updated = await service.updateDispute(userId, req.params.disputeId as string, input);
    res.json(updated);
};

export const deleteDispute: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await service.deleteDispute(userId, req.params.disputeId as string);
    res.status(204).send();
};

export const addEvidence: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const { attachmentId } = AddEvidenceSchema.parse(req.body);
    await service.addEvidence(userId, req.params.disputeId as string, attachmentId);
    res.status(204).send();
};

export const removeEvidence: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await service.removeEvidence(userId, req.params.disputeId as string, req.params.attachmentId as string);
    res.status(204).send();
};
