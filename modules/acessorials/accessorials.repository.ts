import { prisma } from "../../lib/prisma";

export class AccessorialsRepository {
    async delete(id: string) {
        return await prisma.accessorial.delete({ where: { id } });
    }
}