import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class LoadsRepository {
    create(data: Prisma.LoadCreateInput) {
        return prisma.load.create({ data });
    }

    findById(id: string) {
        return prisma.load.findUnique({
            where: { id },
            include: { stops: true, timelineEvents: true, attachments: true },
        });
    }

    list(where: Prisma.LoadWhereInput) {
        return prisma.load.findMany({
            where,
            orderBy: { createdAt: "desc" },
            // select: {
            //     id: true,
            //     loadNumber: true,
            //     status: true,
            //     loadType: true,
            //     mode: true,
            //     brokerCompanyName: true,
            //     createdAt: true,
                
            // },
        });
    }

    update(id: string, data: Prisma.LoadUpdateInput) {
        return prisma.load.update({ where: { id }, data });
    }

    delete(id: string) {
        return prisma.load.delete({ where: { id } });
    }
}
