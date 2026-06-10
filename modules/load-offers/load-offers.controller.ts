import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { LoadOffersService } from "./load-offers.service.js";

const service = new LoadOffersService();

function getUserId(req: any) {
    const userId = req.auth?.userId;

    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    return userId;
}

export const createDispatcherOffer: RequestHandler = async (req, res) => {
    const result = await service.createOffer(getUserId(req), req.body);
    return res.status(201).json(result);
};

export const listDispatcherOffers: RequestHandler = async (req, res) => {
    const result = await service.listDispatcherOffers(getUserId(req));
    return res.json(result);
};

export const getDispatcherOffer: RequestHandler = async (req, res) => {
    const result = await service.getDispatcherOffer(
        getUserId(req),
        req.params.id as string
    );

    return res.json(result);
};

export const cancelDispatcherOffer: RequestHandler = async (req, res) => {
    const result = await service.cancelOffer(getUserId(req), req.params.id as string);
    return res.json(result);
};

export const listDriverOffers: RequestHandler = async (req, res) => {
    const result = await service.listDriverOffers(getUserId(req));
    return res.json(result);
};

export const getDriverOffer: RequestHandler = async (req, res) => {
    const result = await service.getDriverOffer(
        getUserId(req),
        req.params.id as string
    );

    return res.json(result);
};

export const acceptDriverOffer: RequestHandler = async (req, res) => {
    const result = await service.acceptOffer(getUserId(req), req.params.id as string);
    return res.json(result);
};

export const rejectDriverOffer: RequestHandler = async (req, res) => {
    const result = await service.rejectOffer(
        getUserId(req),
        req.params.id as string,
        req.body
    );

    return res.json(result);
};