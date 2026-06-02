import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import {
    listLoadBaseDetailsRevisionsSchema,
    updateLoadBaseDetailsSchema,
} from "./load-base-details.schema.js";
import { LoadBaseDetailsService } from "./load-base-details.service.js";

const service = new LoadBaseDetailsService();

function getUserId(req: any) {
    const userId = req.auth?.userId;

    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    return userId;
}

export const updateLoadBaseDetails: RequestHandler = async (req: any, res) => {
    const userId = getUserId(req);

    const { params, body } = updateLoadBaseDetailsSchema.parse({
        params: req.params,
        body: req.body,
    });

    const result = await service.update({
        userId,
        loadId: params.id,
        body,
    });

    res.json(result);
};

export const listLoadBaseDetailsRevisions: RequestHandler = async (
    req: any,
    res
) => {
    const userId = getUserId(req);

    const { params } = listLoadBaseDetailsRevisionsSchema.parse({
        params: req.params,
    });

    const result = await service.listRevisions({
        userId,
        loadId: params.id,
    });

    res.json({
        data: result,
    });
};