import { DispatcherDriverConnectionStatus, UserType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";

function generateCode(prefix: "DRV" | "DSP") {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    const time = Date.now().toString().slice(-5);

    return `${prefix}-${time}${random}`;
}

const dispatcherTypes = [
    UserType.INDEPENDENT_DISPATCHER,
    UserType.COMPANY_DISPATCHER,
    UserType.CARRIER_ADMIN,
];

const driverTypes = [
    UserType.COMPANY_DRIVER,
    UserType.INDEPENDENT_COMPANY_DRIVER,
    UserType.OWNER_OPERATOR,
];

export class DispatcherService {
    async ensureUserCodes(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                userType: true,
                driverCode: true,
                dispatcherCode: true,
            },
        });

        if (!user) {
            throw new AppError(404, "User not found");
        }

        const data: any = {};

        if (!user.driverCode) {
            data.driverCode = generateCode("DRV");
        }

        if (!user.dispatcherCode) {
            data.dispatcherCode = generateCode("DSP");
        }

        if (Object.keys(data).length === 0) {
            return user;
        }

        return prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                userType: true,
                driverCode: true,
                dispatcherCode: true,
            },
        });
    }

    async getProfile(userId: string) {
        await this.ensureUserCodes(userId);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                userType: true,
                driverCode: true,
                dispatcherCode: true,
                dispatcherProfile: true,
            },
        });

        if (!user) {
            throw new AppError(404, "User not found");
        }

        return { user };
    }

    async upsertProfile(
        userId: string,
        input: {
            userType?: UserType;
            companyName?: string;
            displayName?: string;
        }
    ) {
        await this.ensureUserCodes(userId);

        if (input.userType && !dispatcherTypes.includes(input.userType as any)) {
            throw new AppError(
                400,
                "Invalid dispatcher user type. Use INDEPENDENT_DISPATCHER, COMPANY_DISPATCHER, or CARRIER_ADMIN."
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                userType: input.userType,
                dispatcherProfile: {
                    upsert: {
                        create: {
                            companyName: input.companyName ?? null,
                            displayName: input.displayName ?? null,
                        },
                        update: {
                            companyName: input.companyName ?? undefined,
                            displayName: input.displayName ?? undefined,
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                driverCode: true,
                dispatcherCode: true,
                dispatcherProfile: true,
            },
        });

        return { user: updatedUser };
    }

    async inviteDriver(dispatcherId: string, input: { driverCode: string }) {
        const dispatcher = await prisma.user.findUnique({
            where: { id: dispatcherId },
            select: {
                id: true,
                userType: true,
                dispatcherCode: true,
            },
        });

        if (!dispatcher) {
            throw new AppError(404, "Dispatcher not found");
        }

        if (!dispatcher.userType || !dispatcherTypes.includes(dispatcher.userType as any)) {
            throw new AppError(403, "Only dispatcher users can invite drivers");
        }

        const cleanDriverCode = String(input.driverCode || "").trim().toUpperCase();

        if (!cleanDriverCode) {
            throw new AppError(400, "driverCode is required");
        }

        const driver = await prisma.user.findFirst({
            where: {
                driverCode: cleanDriverCode,
            },
            select: {
                id: true,
                name: true,
                email: true,
                userType: true,
                driverCode: true,
            },
        });

        if (!driver) {
            throw new AppError(404, "Driver not found");
        }

        if (driver.id === dispatcherId) {
            throw new AppError(400, "You cannot invite yourself");
        }

        if (driver.userType && !driverTypes.includes(driver.userType as any)) {
            throw new AppError(400, "The provided code does not belong to a driver user");
        }

        const existing = await prisma.dispatcherDriverConnection.findUnique({
            where: {
                dispatcherId_driverId: {
                    dispatcherId,
                    driverId: driver.id,
                },
            },
        });

        if (existing) {
            if (existing.status === DispatcherDriverConnectionStatus.ACTIVE) {
                throw new AppError(409, "Driver is already connected to this dispatcher");
            }

            if (existing.status === DispatcherDriverConnectionStatus.PENDING) {
                throw new AppError(409, "Connection invite is already pending");
            }

            const updated = await prisma.dispatcherDriverConnection.update({
                where: { id: existing.id },
                data: {
                    status: DispatcherDriverConnectionStatus.PENDING,
                    invitedById: dispatcherId,
                    acceptedAt: null,
                    rejectedAt: null,
                    revokedAt: null,
                    cancelledAt: null,
                    blockedAt: null,
                },
                include: {
                    driver: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            userType: true,
                            driverCode: true,
                        },
                    },
                },
            });

            return { connection: updated };
        }

        const connection = await prisma.dispatcherDriverConnection.create({
            data: {
                dispatcherId,
                driverId: driver.id,
                invitedById: dispatcherId,
                status: DispatcherDriverConnectionStatus.PENDING,
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                        driverCode: true,
                    },
                },
            },
        });

        return { connection };
    }

    async listDispatcherConnections(dispatcherId: string) {
        const data = await prisma.dispatcherDriverConnection.findMany({
            where: {
                dispatcherId,
                status: {
                    in: [
                        DispatcherDriverConnectionStatus.PENDING,
                        DispatcherDriverConnectionStatus.ACTIVE,
                    ],
                },
            },
            orderBy: { createdAt: "desc" },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                        driverCode: true,
                        isActive: true,
                        updatedAt: true,
                        loads: {
                            take: 1,
                            orderBy: { updatedAt: "desc" },
                            select: {
                                id: true,
                                loadNumber: true,
                                status: true,
                                updatedAt: true,
                            },
                        },
                    },
                },
            },
        });

        return { data };
    }

    async cancelConnection(dispatcherId: string, connectionId: string) {
        const connection = await prisma.dispatcherDriverConnection.findFirst({
            where: {
                id: connectionId,
                dispatcherId,
                status: DispatcherDriverConnectionStatus.PENDING,
            },
        });

        if (!connection) {
            throw new AppError(404, "Pending connection not found");
        }

        const updated = await prisma.dispatcherDriverConnection.update({
            where: { id: connectionId },
            data: {
                status: DispatcherDriverConnectionStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });

        return { connection: updated };
    }

    async revokeConnection(dispatcherId: string, connectionId: string) {
        const connection = await prisma.dispatcherDriverConnection.findFirst({
            where: {
                id: connectionId,
                dispatcherId,
                status: DispatcherDriverConnectionStatus.ACTIVE,
            },
        });

        if (!connection) {
            throw new AppError(404, "Active connection not found");
        }

        const updated = await prisma.dispatcherDriverConnection.update({
            where: { id: connectionId },
            data: {
                status: DispatcherDriverConnectionStatus.REVOKED,
                revokedAt: new Date(),
            },
        });

        return { connection: updated };
    }

    async listDriverInvites(driverId: string) {
        const data = await prisma.dispatcherDriverConnection.findMany({
            where: {
                driverId,
                status: DispatcherDriverConnectionStatus.PENDING,
            },
            orderBy: { createdAt: "desc" },
            include: {
                dispatcher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                        dispatcherCode: true,
                        dispatcherProfile: true,
                    },
                },
            },
        });

        return { data };
    }

    async acceptInvite(driverId: string, connectionId: string) {
        const connection = await prisma.dispatcherDriverConnection.findFirst({
            where: {
                id: connectionId,
                driverId,
                status: DispatcherDriverConnectionStatus.PENDING,
            },
        });

        if (!connection) {
            throw new AppError(404, "Pending invite not found");
        }

        const updated = await prisma.dispatcherDriverConnection.update({
            where: { id: connectionId },
            data: {
                status: DispatcherDriverConnectionStatus.ACTIVE,
                acceptedAt: new Date(),
            },
            include: {
                dispatcher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        dispatcherCode: true,
                        dispatcherProfile: true,
                    },
                },
            },
        });

        return { connection: updated };
    }

    async rejectInvite(driverId: string, connectionId: string) {
        const connection = await prisma.dispatcherDriverConnection.findFirst({
            where: {
                id: connectionId,
                driverId,
                status: DispatcherDriverConnectionStatus.PENDING,
            },
        });

        if (!connection) {
            throw new AppError(404, "Pending invite not found");
        }

        const updated = await prisma.dispatcherDriverConnection.update({
            where: { id: connectionId },
            data: {
                status: DispatcherDriverConnectionStatus.REJECTED,
                rejectedAt: new Date(),
            },
        });

        return { connection: updated };
    }
}