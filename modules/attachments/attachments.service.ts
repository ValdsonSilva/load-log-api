import { sha256Hex } from "../../utils/hash.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../../lib/cloudinary.js";
import { AttachmentsRepository } from "./attachments.repository.js";

export class AttachmentsService {
  constructor(private repo = new AttachmentsRepository()) {}

  private async assertLoadOwned(userId: string, loadId: string) {
    const load = await prisma.load.findUnique({
      where: { id: loadId },
      select: { id: true, driverId: true },
    });
    if (!load) throw new AppError(404, "Load not found");
    if (load.driverId !== userId) throw new AppError(403, "Forbidden");
    return load;
  }

  private async assertEventOwned(userId: string, eventId: string) {
    const ev = await prisma.timelineEvent.findUnique({
      where: { id: eventId },
      include: { load: { select: { id: true, driverId: true } } },
    });
    if (!ev) throw new AppError(404, "Event not found");
    if (ev.load.driverId !== userId) throw new AppError(403, "Forbidden");
    return ev;
  }

  async uploadToLoad(params: {
    userId: string;
    loadId: string;
    type: any;
    file: Express.Multer.File;
  }) {
    const { userId, loadId, type, file } = params;
    await this.assertLoadOwned(userId, loadId);

    const checksum = sha256Hex(file.buffer);

    const uploaded = await uploadBufferToCloudinary({
      buffer: file.buffer,
      folder: `loads/${loadId}`,
      fileName: file.originalname,
    });

    return this.repo.create({
      load: { connect: { id: loadId } },
      type,
      fileName: file.originalname,
      mimeType: file.mimetype,
      storageKey: uploaded.publicId,
      url: uploaded.secureUrl,
      resourceType: uploaded.resourceType,
      sizeBytes: uploaded.bytes,
      checksumSha256: checksum,
      uploadedBy: { connect: { id: userId } },
    });
  }

  async uploadToEvent(params: {
    userId: string;
    eventId: string;
    type: any;
    file: Express.Multer.File;
  }) {
    const { userId, eventId, type, file } = params;
    const ev = await this.assertEventOwned(userId, eventId);

    const checksum = sha256Hex(file.buffer);

    const uploaded = await uploadBufferToCloudinary({
      buffer: file.buffer,
      folder: `loads/${ev.loadId}/events/${eventId}`,
      fileName: file.originalname,
    });

    return this.repo.create({
      load: { connect: { id: ev.loadId } },
      timelineEvent: { connect: { id: eventId } },
      type,
      fileName: file.originalname,
      mimeType: file.mimetype,
      storageKey: uploaded.publicId,
      url: uploaded.secureUrl,
      resourceType: uploaded.resourceType,
      sizeBytes: uploaded.bytes,
      checksumSha256: checksum,
      uploadedBy: { connect: { id: userId } },
    });
  }

  async listLoadAttachments(userId: string, loadId: string) {
    await this.assertLoadOwned(userId, loadId);
    return this.repo.listByLoad(loadId);
  }

  async listEventAttachments(userId: string, eventId: string) {
    await this.assertEventOwned(userId, eventId);
    return this.repo.listByEvent(eventId);
  }

  async deleteAttachment(userId: string, attachmentId: string) {
    const att = await this.repo.findById(attachmentId);
    if (!att) throw new AppError(404, "Attachment not found");

    const ownerId = att.load?.driverId ?? att.timelineEvent?.load.driverId ?? null;
    if (!ownerId) throw new AppError(400, "Attachment missing owner reference");
    if (ownerId !== userId) throw new AppError(403, "Forbidden");

    await deleteFromCloudinary({ publicId: att.storageKey, resourceType: att.resourceType });
    await this.repo.delete(attachmentId);
  }
}
