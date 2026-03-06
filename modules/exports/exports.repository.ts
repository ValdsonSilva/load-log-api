import { prisma } from "../../lib/prisma.js";

export class ExportsRepository {
    async getNextVersion(loadId: string) {
        const last = await prisma.loadExport.findFirst({
            where: { loadId },
            orderBy: { version: "desc" },
        });

        return last ? last.version + 1 : 1;
    }

    async create(data: any) {
        return prisma.loadExport.create({ data });
    }

    async listByLoad(loadId: string) {
        return prisma.loadExport.findMany({
            where: { loadId },
            orderBy: { version: "desc" },
        });
    }
}