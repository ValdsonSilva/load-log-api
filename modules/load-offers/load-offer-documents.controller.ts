import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { LoadOfferDocumentsService } from "./load-offer-documents.service.js";

const service = new LoadOfferDocumentsService();

function getUserId(req: any) {
    const userId = req.auth?.userId;

    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    return userId;
}

export const uploadDispatcherDocument: RequestHandler = async (req, res) => {
    const result = await service.uploadDispatcherDocument(
        getUserId(req),
        req.params.id as string,
        req.body
    );

    return res.status(201).json(result);
};

export const listDispatcherDocuments: RequestHandler = async (req, res) => {
    const result = await service.listDispatcherDocuments(
        getUserId(req),
        req.params.id as string
    );

    return res.json(result);
};

export const deleteDispatcherDocument: RequestHandler = async (req, res) => {
    const result = await service.deleteDispatcherDocument(
        getUserId(req),
        req.params.id as string,
        req.params.documentId as string
    );

    return res.json(result);
};

export const listDriverDocuments: RequestHandler = async (req, res) => {
    const result = await service.listDriverDocuments(
        getUserId(req),
        req.params.id as string
    );

    return res.json(result);
};