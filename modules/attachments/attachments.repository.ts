// import { Prisma } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class AttachmentsRepository {
    create(data: Prisma.AttachmentCreateInput) {
        return prisma.attachment.create({ data });
    }

    findById(id: string) {
        return prisma.attachment.findUnique({
            where: { id },
            include: {
                load: { select: { id: true, driverId: true } },
                timelineEvent: { include: { load: { select: { id: true, driverId: true } } } },
            },
        });
    }

    listByLoad(loadId: string) {
        return prisma.attachment.findMany({
            where: { loadId, timelineEventId: null },
            orderBy: { createdAt: "desc" },
        });
    }

    listByEvent(eventId: string) {
        return prisma.attachment.findMany({
            where: { timelineEventId: eventId },
            orderBy: { createdAt: "desc" },
        });
    }

    delete(id: string) {
        return prisma.attachment.delete({ where: { id } });
    }
}
