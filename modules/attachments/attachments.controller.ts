import type { Request, RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { CreateAttachmentMetaSchema } from "./attachments.schema.js";
import { AttachmentsService } from "./attachments.service.js";

const service = new AttachmentsService();

export const uploadLoadAttachment: RequestHandler = async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");
    if (!req.file) throw new AppError(400, "file is required");

    const meta = CreateAttachmentMetaSchema.parse(req.body);

    const att = await service.uploadToLoad({
        userId,
        loadId: req.params.loadId,
        type: meta.type,
        file: req.file,
    });

    res.status(201).json(att);
};

export const uploadEventAttachment: RequestHandler = async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");
    if (!req.file) throw new AppError(400, "file is required");

    const meta = CreateAttachmentMetaSchema.parse(req.body);

    const att = await service.uploadToEvent({
        userId,
        eventId: req.params.eventId,
        type: meta.type,
        file: req.file,
    });

    res.status(201).json(att);
};

export const listLoadAttachments: RequestHandler = async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const list = await service.listLoadAttachments(userId, req.params.loadId);
    res.json(list);
};

export const listEventAttachments: RequestHandler = async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const list = await service.listEventAttachments(userId, req.params.eventId);
    res.json(list);
};

export const deleteAttachment: RequestHandler = async (req: any, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await service.deleteAttachment(userId, req.params.attachmentId);
    res.status(204).send();
};
