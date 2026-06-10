import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
    acceptDriverOffer,
    cancelDispatcherOffer,
    createDispatcherOffer,
    getDispatcherOffer,
    getDriverOffer,
    listDispatcherOffers,
    listDriverOffers,
    rejectDriverOffer,
} from "./load-offers.controller.js";

export const loadOffersRoutes = Router();

loadOffersRoutes.use(requireAuth);

loadOffersRoutes.post("/dispatcher", createDispatcherOffer);
loadOffersRoutes.get("/dispatcher", listDispatcherOffers);
loadOffersRoutes.get("/dispatcher/:id", getDispatcherOffer);
loadOffersRoutes.patch("/dispatcher/:id/cancel", cancelDispatcherOffer);

loadOffersRoutes.get("/driver", listDriverOffers);
loadOffersRoutes.get("/driver/:id", getDriverOffer);
loadOffersRoutes.post("/driver/:id/accept", acceptDriverOffer);
loadOffersRoutes.post("/driver/:id/reject", rejectDriverOffer);