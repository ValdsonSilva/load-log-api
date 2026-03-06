import { prisma } from "../../lib/prisma.js";

export class SubscriptionsService {
    async getMySubscription(userId: string) {
        return prisma.subscription.findUnique({
            where: { userId },
        });
    }
}
