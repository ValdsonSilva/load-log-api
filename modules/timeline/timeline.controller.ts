import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { TimelineService } from "./timeline.service.js";
import { createTimelineEventSchema } from "./timeline.schema.js";

const service = new TimelineService();

export const createEvent = async (req: any, res: any) => {
    try {
        const userId = req.auth?.userId;

        console.log("CREATE TIMELINE EVENT BODY:", req.body);
        console.log("CREATE TIMELINE EVENT PARAMS:", req.params);

        const { params, body } = createTimelineEventSchema.parse({
            params: req.params,
            body: req.body,
        });

        const result = await service.createEvent(
            userId,
            params.loadId,
            body
        );

        return res.status(201).json(result);
    } catch (err: any) {
        console.error("CREATE TIMELINE EVENT ERROR:", {
            name: err?.name,
            message: err?.message,
            issues: err?.issues,
            code: err?.code,
            meta: err?.meta,
            stack: err?.stack,
        });

        throw err;
    }
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

    const input = createTimelineEventSchema.parse(req.body);
    const updated = await service.updateEvent(userId, req.params.eventId as string, input);
    res.json(updated);
};

export const deleteEvent: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    await service.deleteEvent(userId, req.params.eventId as string);
    res.status(204).send();
};