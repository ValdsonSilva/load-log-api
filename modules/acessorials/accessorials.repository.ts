import { prisma } from "../../lib/prisma";

export class AccessorialsRepository {
    delete(id: string) {
        return prisma.accessorial.delete({ where: { id } });
    }
}