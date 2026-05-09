import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/auth.js";
import { parseLoadDocument } from "./ocr.controller.js";

export const ocrRoutes = Router();

ocrRoutes.use(requireAuth);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024,
    },
});

ocrRoutes.post("/load-draft", upload.single("file"), parseLoadDocument);