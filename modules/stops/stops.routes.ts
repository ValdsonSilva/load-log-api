import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { createStop, listStops, updateStop, deleteStop } from "./stops.controller.js";

export const stopsRoutes = Router();

stopsRoutes.use(requireAuth);

stopsRoutes.post("/loads/:loadId/stops", createStop);
stopsRoutes.get("/loads/:loadId/stops", listStops);

stopsRoutes.patch("/stops/:stopId", updateStop);
stopsRoutes.delete("/stops/:stopId", deleteStop);
