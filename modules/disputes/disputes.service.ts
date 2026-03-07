import { Prisma } from "@prisma/client";
import { prisma, } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";
import { DisputesRepository } from "./disputes.repository.js";

export class DisputesService {
    constructor(private repo = new DisputesRepository()) { }

    // verificando se determinado motorista é proprietário da carga e retorna a carga 
    private async assertLoadOwned(userId: string, loadId: string) {
        const load = await prisma.load.findUnique({
            where: { id: loadId },
            select: { id: true, driverId: true },
        });
        if (!load) throw new AppError(404, "Load not found");
        if (load.driverId !== userId) throw new AppError(403, "Forbidden");
        return load;
    }

    // verifica se o motorista está vinculado a disputa e retorna a disputa
    private async assertDisputeOwned(userId: string, disputeId: string) {
        const dispute = await this.repo.findById(disputeId);
        if (!dispute) throw new AppError(404, "Dispute not found");
        if (dispute.load.driverId !== userId) throw new AppError(403, "Forbidden");
        return dispute;
    }

    async createDispute(userId: string, loadId: string, input: any) {
        await this.assertLoadOwned(userId, loadId);

        return this.repo.create({
            load: { connect: { id: loadId } },
            createdBy: { connect: { id: userId } },
            disputeType: input.disputeType,
            amountClaimed: String(input.amountClaimed), // quantidade reinvidicada
            status: "OPEN",
            resolutionNotes: input.resolutionNotes,
        });
    }

    async listDisputes(userId: string, loadId: string) {
        await this.assertLoadOwned(userId, loadId);
        return this.repo.listByLoad(loadId);
    }

    async getDispute(userId: string, disputeId: string) {
        return this.assertDisputeOwned(userId, disputeId);
    }

    async updateDispute(userId: string, disputeId: string, input: any) {
        await this.assertDisputeOwned(userId, disputeId);

        const data: any = {};
        if (input.disputeType) data.disputeType = input.disputeType;
        if (input.status) data.status = input.status;
        if (input.resolutionNotes !== undefined) data.resolutionNotes = input.resolutionNotes;
        if (input.amountClaimed !== undefined) data.amountClaimed = String(input.amountClaimed);

        return this.repo.update(disputeId, data);
    }

    async deleteDispute(userId: string, disputeId: string) {
        await this.assertDisputeOwned(userId, disputeId);
        await this.repo.delete(disputeId);
    }

    async addEvidence(userId: string, disputeId: string, attachmentId: string) {
        const dispute = await this.assertDisputeOwned(userId, disputeId);

        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: { timelineEvent: { select: { loadId: true } }, load: { select: { id: true, driverId: true } } },
        });
        if (!attachment) throw new AppError(404, "Attachment not found");

        // garantir ownership
        const ownerId = attachment.load?.driverId ?? null;
        if (ownerId && ownerId !== userId) throw new AppError(403, "Forbidden");

        // garantir que o anexo pertence ao mesmo load da disputa
        const attachmentLoadId = attachment.loadId ?? attachment.timelineEvent?.loadId ?? null;
        if (!attachmentLoadId) throw new AppError(400, "Attachment without load reference");
        if (attachmentLoadId !== dispute.loadId) {
            throw new AppError(400, "Attachment must belong to the same load of the dispute");
        }

        try {
            await this.repo.addEvidence(disputeId, attachmentId);
        } catch (err: any) {
            // se já existir (chave composta), podemos ignorar
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                return;
            }
            throw err;
        }
    }

    async removeEvidence(userId: string, disputeId: string, attachmentId: string) {
        await this.assertDisputeOwned(userId, disputeId);
        await this.repo.removeEvidence(disputeId, attachmentId);
    }
}
