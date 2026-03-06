import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { TimelineService } from "./timeline.service.js";
import { CreateTimelineEventSchema, UpdateTimelineEventSchema } from "./timeline.schema.js";

const service = new TimelineService();

export const createEvent: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");


    const input = CreateTimelineEventSchema.parse(req.body);
    const ev = await service.createEvent(userId, req.params.loadId as string, input);
    res.status(201).json(ev);
};

export const listEvents: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const events = await service.listEvents(userId, req.params.loadId as string);
    res.json(events);
};

export const updateEvent: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const input = UpdateTimelineEventSchema.parse(req.body);
    const updated = await service.updateEvent(userId, req.params.eventId as string, input);
    res.json(updated);
};

export const deleteEvent: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await service.deleteEvent(userId, req.params.eventId as string);
    res.status(204).send();
};