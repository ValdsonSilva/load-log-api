import { Prisma } from "../../lib/generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";

export class InvitationsService {
    async redeem(userId: string, codeRaw: string) {
        const code = codeRaw.trim();

        return prisma.$transaction(async (tx) => {
            const invite = await tx.invitationCode.findUnique({
                where: { code },
            });

            if (!invite) throw new AppError(404, "Invitation code not found");
            if (invite.status !== "ACTIVE") throw new AppError(400, "Invitation code is not active");
            if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
                throw new AppError(400, "Invitation code expired");
            }
            if (invite.redeemedCount >= invite.maxRedemptions) {
                throw new AppError(400, "Invitation code redemption limit reached");
            }

            // registra redemption (idempotência: se já resgatou, não duplica)
            try {
                await tx.invitationRedemption.create({
                    data: {
                        code: { connect: { id: invite.id } },
                        user: { connect: { id: userId } },
                    },
                });

                await tx.invitationCode.update({
                    where: { id: invite.id },
                    data: { redeemedCount: { increment: 1 } },
                });
            } catch (err: any) {
                if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                    // já resgatou este code antes; segue fluxo (retorna subscription atualizada)
                } else {
                    throw err;
                }
            }

            // upsert subscription
            const sub = await tx.subscription.upsert({
                where: { userId },
                create: {
                    user: { connect: { id: userId } },
                    planType: invite.planType,
                    status: "ACTIVE",
                    source: "INVITATION",
                    startedAt: new Date(),
                    expiresAt: invite.expiresAt ?? null,
                },
                update: {
                    planType: invite.planType,
                    status: "ACTIVE",
                    source: "INVITATION",
                    // não reseta startedAt se você não quiser; aqui mantemos o startedAt original
                    expiresAt: invite.expiresAt ?? undefined,
                },
            });

            // opcional: desabilitar code ao atingir limite
            const fresh = await tx.invitationCode.findUnique({ where: { id: invite.id } });
            if (fresh && fresh.redeemedCount >= fresh.maxRedemptions) {
                await tx.invitationCode.update({
                    where: { id: invite.id },
                    data: { status: "DISABLED" },
                });
            }

            return sub;
        });
    }
}
