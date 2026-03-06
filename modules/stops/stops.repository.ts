import { Prisma } from "../../lib/generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";

export class StopsRepository {
    create(data: Prisma.StopCreateInput) {
        return prisma.stop.create({ data });
    }

    findById(stopId: string) {
        return prisma.stop.findUnique({
            where: { id: stopId },
            include: { load: { select: { id: true, driverId: true } } },
        });
    }

    listByLoad(loadId: string) {
        return prisma.stop.findMany({
            where: { loadId },
            orderBy: { sequence: "asc" },
        });
    }

    update(stopId: string, data: Prisma.StopUpdateInput) {
        return prisma.stop.update({ where: { id: stopId }, data });
    }

    delete(stopId: string) {
        return prisma.stop.delete({ where: { id: stopId } });
    }

    async nextSequence(loadId: string) {
        const agg = await prisma.stop.aggregate({
            where: { loadId },
            _max: { sequence: true },
        });
        return (agg._max.sequence ?? 0) + 1;
    }
}
