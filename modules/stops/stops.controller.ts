import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { StopsService } from "./stops.service.js";
import { CreateStopSchema, UpdateStopSchema } from "./stops.schemas.js";
import { json } from "zod";

const service = new StopsService();

export const createStop: RequestHandler = async (req, res) => {
    // const userId = req.auth?.userId;
    // if (!userId) throw new AppError(401, "Unauthorized");

    // const loadId = req.params.loadId as string;
    // const input = CreateStopSchema.parse(req.body);

    try {
        const userId = req.auth?.userId;
        if (!userId) throw new AppError(401, "Unauthorized");

        const loadId = req.params.loadId as string;
        const input = CreateStopSchema.parse(req.body);

        const stop = await service.createStop(userId, loadId, input);
        res.status(201).json(stop);
    } catch (err: any) {
        return res.status(500).json({ message: "Erro ao criar evento de parada", error: err.message })
    }
};

export const listStops: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const stops = await service.listStops(userId, req.params.loadId as string);
    res.json(stops);
};

export const updateStop: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const input = UpdateStopSchema.parse(req.body);
    const updated = await service.updateStop(userId, req.params.stopId as string, input);
    res.json(updated);
};

export const deleteStop: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await service.deleteStop(userId, req.params.stopId as string);
    res.status(204).send();
};
