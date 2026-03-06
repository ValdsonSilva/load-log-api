import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/auth.js";
import {
  uploadLoadAttachment,
  uploadEventAttachment,
  listLoadAttachments,
  listEventAttachments,
  deleteAttachment,
} from "./attachments.controller.js";

export const attachmentsRoutes = Router();

attachmentsRoutes.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

attachmentsRoutes.post("/loads/:loadId/attachments", upload.single("file"), uploadLoadAttachment);
attachmentsRoutes.get("/loads/:loadId/attachments", listLoadAttachments);

attachmentsRoutes.post("/events/:eventId/attachments", upload.single("file"), uploadEventAttachment);
attachmentsRoutes.get("/events/:eventId/attachments", listEventAttachments);

attachmentsRoutes.delete("/attachments/:attachmentId", deleteAttachment);
