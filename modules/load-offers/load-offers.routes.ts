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
import {
    deleteDispatcherDocument,
    listDispatcherDocuments,
    listDriverDocuments,
    uploadDispatcherDocument,
} from "./load-offer-documents.controller.js";

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

// Document routes
loadOffersRoutes.post("/dispatcher/:id/documents", uploadDispatcherDocument);
loadOffersRoutes.get("/dispatcher/:id/documents", listDispatcherDocuments);
loadOffersRoutes.delete("/dispatcher/:id/documents/:documentId", deleteDispatcherDocument);
loadOffersRoutes.get("/driver/:id/documents", listDriverDocuments);