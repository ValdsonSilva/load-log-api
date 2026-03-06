import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { createEvent, listEvents, updateEvent, deleteEvent } from "./timeline.controller.js";

export const timelineRoutes = Router();

timelineRoutes.use(requireAuth);

timelineRoutes.post("/loads/:loadId/events", createEvent);
timelineRoutes.get("/loads/:loadId/events", listEvents);

timelineRoutes.patch("/events/:eventId", updateEvent);
timelineRoutes.delete("/events/:eventId", deleteEvent);