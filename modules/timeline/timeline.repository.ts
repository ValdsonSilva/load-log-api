import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class TimelineRepository {
    create(data: Prisma.TimelineEventCreateInput) {
        return prisma.timelineEvent.create({ data });
    }

    findById(eventId: string) {
        return prisma.timelineEvent.findUnique({
            where: { id: eventId },
            include: { load: { select: { id: true, driverId: true } }, attachments: true },
        });
    }

    listByLoad(loadId: string) {
        return prisma.timelineEvent.findMany({
            where: { loadId },
            orderBy: { occurredAtUtc: "asc" },
            include: { attachments: true },
        });
    }

    update(eventId: string, data: Prisma.TimelineEventUpdateInput) {
        return prisma.timelineEvent.update({ where: { id: eventId }, data });
    }

    delete(eventId: string) {
        return prisma.timelineEvent.delete({ where: { id: eventId } });
    }

    lastEventForLoad(loadId: string) {
        return prisma.timelineEvent.findFirst({
            where: { loadId },
            orderBy: [{ sequence: "desc" }], 
            select: { sequence: true, hash: true, type: true },
        });
    }

    createRevision(data: Prisma.TimelineEventRevisionCreateInput) {
        return prisma.timelineEventRevision.create({ data });
    }

    exportsCount(loadId: string) {
        return prisma.loadExport.count({ where: { loadId } });
    }
}
