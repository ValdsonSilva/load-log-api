import { Prisma } from "../../lib/generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";

export class DisputesRepository {
    create(data: Prisma.DisputeCreateInput) {
        return prisma.dispute.create({
            data,
            include: {
                evidences: { include: { attachment: true } },
            },
        });
    }

    listByLoad(loadId: string) {
        return prisma.dispute.findMany({
            where: { loadId },
            orderBy: { createdAt: "desc" },
            include: {
                evidences: { include: { attachment: true } },
            },
        });
    }

    findById(disputeId: string) {
        return prisma.dispute.findUnique({
            where: { id: disputeId },
            include: {
                load: { select: { id: true, driverId: true } },
                evidences: { include: { attachment: true } },
            },
        });
    }

    update(disputeId: string, data: Prisma.DisputeUpdateInput) {
        return prisma.dispute.update({
            where: { id: disputeId },
            data,
            include: {
                evidences: { include: { attachment: true } },
            },
        });
    }

    delete(disputeId: string) {
        return prisma.dispute.delete({ where: { id: disputeId } });
    }

    addEvidence(disputeId: string, attachmentId: string) {
        return prisma.disputeEvidence.create({
            data: {
                dispute: { connect: { id: disputeId } },
                attachment: { connect: { id: attachmentId } },
            },
        });
    }

    removeEvidence(disputeId: string, attachmentId: string) {
        return prisma.disputeEvidence.delete({
            where: { disputeId_attachmentId: { disputeId, attachmentId } },
        });
    }
}
