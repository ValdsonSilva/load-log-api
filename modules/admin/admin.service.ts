import { AccessorialType, LoadStatus, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";

type PaginationInput = {
    page?: number;
    limit?: number;
};

type ListUsersInput = PaginationInput & {
    search?: string;
    role?: string;
    isActive?: boolean;
};

type ListLoadsInput = PaginationInput & {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
};

function toPage(value: unknown) {
    return Math.max(Number(value) || 1, 1);
}

function toLimit(value: unknown) {
    return Math.min(Math.max(Number(value) || 25, 1), 100);
}

function toBoolean(value: unknown) {
    if (value === undefined) return undefined;
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
}

function normalizeExpenseType(type: unknown) {
    const raw = String(type || "OTHER").trim().toUpperCase();

    if (raw === "REEFER_FUEL") {
        return {
            type: AccessorialType.FUEL,
            notesPrefix: "Reefer fuel",
        };
    }

    const allowed = Object.values(AccessorialType);

    if (allowed.includes(raw as AccessorialType)) {
        return {
            type: raw as AccessorialType,
            notesPrefix: null,
        };
    }

    return {
        type: AccessorialType.OTHER,
        notesPrefix: null,
    };
}

function buildExpenseNotes(notes: unknown, prefix: string | null) {
    const cleanNotes = typeof notes === "string" ? notes.trim() : "";

    if (!prefix) {
        return cleanNotes || null;
    }

    if (!cleanNotes) {
        return prefix;
    }

    if (cleanNotes.toLowerCase().startsWith(prefix.toLowerCase())) {
        return cleanNotes;
    }

    return `${prefix}: ${cleanNotes}`;
}

export class AdminService {
    private async writeAuditLog(input: {
        actorId: string;
        action: string;
        targetType: string;
        targetId?: string | null;
        before?: any;
        after?: any;
        metadata?: any;
    }) {
        return prisma.auditLog.create({
            data: {
                actorId: input.actorId,
                action: input.action,
                targetType: input.targetType,
                targetId: input.targetId ?? null,
                before: input.before ?? undefined,
                after: input.after ?? undefined,
                metadata: input.metadata ?? undefined,
            },
        });
    }

    async getDashboardSummary() {
        const [
            totalUsers,
            activeUsers,
            driverUsers,
            adminUsers,
            totalLoads,
            preTripLoads,
            drivingLoads,
            activeLoads,
            completedLoads,
            cancelledLoads,
            totalDocuments,
            totalExpenses,
            totalDisputes,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.count({ where: { role: "DRIVER" } }),
            prisma.user.count({
                where: {
                    role: {
                        in: ["ADMIN", "SUPER_ADMIN"],
                    },
                },
            }),
            prisma.load.count(),
            prisma.load.count({ where: { status: "PRE_TRIP" } }),
            prisma.load.count({ where: { status: "DRIVING" } }),
            prisma.load.count({ where: { status: "ACTIVE" } }),
            prisma.load.count({ where: { status: "COMPLETED" } }),
            prisma.load.count({ where: { status: "CANCELLED" } }),
            prisma.attachment.count(),
            prisma.accessorial.count(),
            prisma.dispute.count(),
        ]);

        const expenseTotal = await prisma.accessorial.aggregate({
            _sum: {
                amount: true,
            },
        });

        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers,
                drivers: driverUsers,
                admins: adminUsers,
            },
            loads: {
                total: totalLoads,
                byStatus: {
                    PRE_TRIP: preTripLoads,
                    DRIVING: drivingLoads,
                    ACTIVE: activeLoads,
                    COMPLETED: completedLoads,
                    CANCELLED: cancelledLoads,
                },
            },
            documents: {
                total: totalDocuments,
            },
            expenses: {
                total: totalExpenses,
                totalAmount: Number(expenseTotal._sum.amount ?? 0),
                currency: "USD",
            },
            disputes: {
                total: totalDisputes,
            },
        };
    }

    async getDashboardActivity() {
        const [recentLoads, recentEvents, recentDocuments, recentAuditLogs] =
            await Promise.all([
                prisma.load.findMany({
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        loadNumber: true,
                        status: true,
                        brokerCompanyName: true,
                        carrierCompanyName: true,
                        createdAt: true,
                        driver: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                }),

                prisma.timelineEvent.findMany({
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        loadId: true,
                        type: true,
                        source: true,
                        occurredAtUtc: true,
                        locationText: true,
                        notes: true,
                        createdAt: true,
                        load: {
                            select: {
                                id: true,
                                loadNumber: true,
                            },
                        },
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                }),

                prisma.attachment.findMany({
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        loadId: true,
                        timelineEventId: true,
                        type: true,
                        fileName: true,
                        mimeType: true,
                        url: true,
                        createdAt: true,
                        uploadedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                }),

                prisma.auditLog.findMany({
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    include: {
                        actor: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                }),
            ]);

        return {
            recentLoads,
            recentEvents,
            recentDocuments,
            recentAuditLogs,
        };
    }

    async listUsers(input: ListUsersInput) {
        const page = toPage(input.page);
        const limit = toLimit(input.limit);
        const skip = (page - 1) * limit;

        const where: any = {};

        if (input.search?.trim()) {
            const search = input.search.trim();

            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
            ];
        }

        if (input.role) {
            where.role = input.role;
        }

        if (typeof input.isActive === "boolean") {
            where.isActive = input.isActive;
        }

        const [data, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    defaultTimeZone: true,
                    avatarUrl: true,
                    createdAt: true,
                    updatedAt: true,
                    subscription: true,
                    _count: {
                        select: {
                            loads: true,
                            attachments: true,
                            disputes: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getUserById(id: string) {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isActive: true,
                defaultTimeZone: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                subscription: true,
                loads: {
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        loadNumber: true,
                        status: true,
                        brokerCompanyName: true,
                        carrierCompanyName: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                _count: {
                    select: {
                        loads: true,
                        attachments: true,
                        disputes: true,
                    },
                },
            },
        });

        if (!user) {
            throw new AppError(404, "User not found");
        }

        return { user };
    }

    async updateUserStatus(actorId: string, userId: string, input: any) {
        if (actorId === userId) {
            throw new AppError(400, "You cannot change your own account status");
        }

        const before = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                isActive: true,
                role: true,
            },
        });

        if (!before) {
            throw new AppError(404, "User not found");
        }

        const status = String(input.status || "").trim().toUpperCase();
        const parsedBoolean = toBoolean(input.isActive);

        let isActive: boolean;

        if (typeof parsedBoolean === "boolean") {
            isActive = parsedBoolean;
        } else if (status === "ACTIVE") {
            isActive = true;
        } else if (status === "DISABLED" || status === "SUSPENDED" || status === "INACTIVE") {
            isActive = false;
        } else {
            throw new AppError(
                400,
                "Invalid status. Use ACTIVE, DISABLED, SUSPENDED, or isActive boolean."
            );
        }

        const after = await prisma.user.update({
            where: { id: userId },
            data: { isActive },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });

        await this.writeAuditLog({
            actorId,
            action: "USER_STATUS_UPDATED",
            targetType: "User",
            targetId: userId,
            before,
            after,
            metadata: {
                reason: input.reason ?? null,
            },
        });

        return { user: after };
    }

    async updateUserRole(actorId: string, userId: string, input: any) {
        if (actorId === userId) {
            throw new AppError(400, "You cannot change your own role");
        }

        const nextRole = String(input.role || "").trim().toUpperCase();

        if (!Object.values(UserRole).includes(nextRole as UserRole)) {
            throw new AppError(400, "Invalid user role");
        }

        const actor = await prisma.user.findUnique({
            where: { id: actorId },
            select: { role: true },
        });

        if (actor?.role !== "SUPER_ADMIN") {
            throw new AppError(403, "Only SUPER_ADMIN can change user roles");
        }

        const before = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        if (!before) {
            throw new AppError(404, "User not found");
        }

        const after = await prisma.user.update({
            where: { id: userId },
            data: {
                role: nextRole as UserRole,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });

        await this.writeAuditLog({
            actorId,
            action: "USER_ROLE_UPDATED",
            targetType: "User",
            targetId: userId,
            before,
            after,
            metadata: {
                reason: input.reason ?? null,
            },
        });

        return { user: after };
    }

    async listLoads(input: ListLoadsInput) {
        const page = toPage(input.page);
        const limit = toLimit(input.limit);
        const skip = (page - 1) * limit;

        const where: any = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.search?.trim()) {
            const search = input.search.trim();

            where.OR = [
                { loadNumber: { contains: search, mode: "insensitive" } },
                { bolNumber: { contains: search, mode: "insensitive" } },
                { proNumber: { contains: search, mode: "insensitive" } },
                { brokerCompanyName: { contains: search, mode: "insensitive" } },
                { carrierCompanyName: { contains: search, mode: "insensitive" } },
                { driver: { email: { contains: search, mode: "insensitive" } } },
                { driver: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        if (input.dateFrom || input.dateTo) {
            where.createdAt = {};

            if (input.dateFrom) {
                where.createdAt.gte = new Date(input.dateFrom);
            }

            if (input.dateTo) {
                where.createdAt.lte = new Date(input.dateTo);
            }
        }

        const allowedSortFields = ["createdAt", "updatedAt", "loadNumber", "status"];
        const sortBy = allowedSortFields.includes(String(input.sortBy))
            ? String(input.sortBy)
            : "createdAt";

        const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";

        const [data, total] = await Promise.all([
            prisma.load.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                select: {
                    id: true,
                    loadNumber: true,
                    proNumber: true,
                    bolNumber: true,
                    status: true,
                    loadType: true,
                    mode: true,
                    brokerCompanyName: true,
                    carrierCompanyName: true,
                    expectedPickupCity: true,
                    expectedPickupState: true,
                    expectedDeliveryCity: true,
                    expectedDeliveryState: true,
                    createdAt: true,
                    updatedAt: true,
                    driver: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    rateAgreement: {
                        select: {
                            id: true,
                            rateAmount: true,
                            rateType: true,
                            quotedMiles: true,
                            paymentMethod: true,
                        },
                    },
                    _count: {
                        select: {
                            stops: true,
                            timelineEvents: true,
                            attachments: true,
                            disputes: true,
                        },
                    },
                },
            }),
            prisma.load.count({ where }),
        ]);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getLoadById(loadId: string) {
        const load = await prisma.load.findUnique({
            where: { id: loadId },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        isActive: true,
                    },
                },
                stops: {
                    orderBy: { sequence: "asc" },
                },
                timelineEvents: {
                    orderBy: { sequence: "asc" },
                    include: {
                        attachments: true,
                        revisions: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                attachments: true,
                rateAgreement: {
                    include: {
                        accessorials: {
                            orderBy: { createdAt: "desc" },
                            include: {
                                attachment: true,
                            },
                        },
                    },
                },
                equipmentSpec: true,
                trackingReq: true,
                penaltyTerms: true,
                disputes: {
                    include: {
                        evidences: {
                            include: {
                                attachment: true,
                            },
                        },
                    },
                },
                loadExports: {
                    orderBy: { exportedAt: "desc" },
                },
                loadBaseDetailsRevisions: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
            },
        });

        if (!load) {
            throw new AppError(404, "Load not found");
        }

        return { load };
    }

    async updateLoadStatus(actorId: string, loadId: string, input: any) {
        const nextStatus = String(input.status || "").trim().toUpperCase();

        if (!Object.values(LoadStatus).includes(nextStatus as LoadStatus)) {
            throw new AppError(400, "Invalid load status");
        }

        const before = await prisma.load.findUnique({
            where: { id: loadId },
            select: {
                id: true,
                loadNumber: true,
                status: true,
            },
        });

        if (!before) {
            throw new AppError(404, "Load not found");
        }

        const after = await prisma.load.update({
            where: { id: loadId },
            data: {
                status: nextStatus as LoadStatus,
            },
            select: {
                id: true,
                loadNumber: true,
                status: true,
                updatedAt: true,
            },
        });

        await this.writeAuditLog({
            actorId,
            action: "LOAD_STATUS_UPDATED",
            targetType: "Load",
            targetId: loadId,
            before,
            after,
            metadata: {
                reason: input.reason ?? null,
            },
        });

        return { load: after };
    }

    async listLoadEvents(loadId: string) {
        await this.ensureLoadExists(loadId);

        const data = await prisma.timelineEvent.findMany({
            where: { loadId },
            orderBy: [{ sequence: "asc" }],
            include: {
                attachments: true,
                revisions: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return { data };
    }

    async updateLoadEvent(actorId: string, loadId: string, eventId: string, input: any) {
        const before = await prisma.timelineEvent.findFirst({
            where: {
                id: eventId,
                loadId,
            },
        });

        if (!before) {
            throw new AppError(404, "Timeline event not found");
        }

        const after = await prisma.timelineEvent.update({
            where: { id: eventId },
            data: {
                notes: input.notes,
                locationText: input.locationText,
                metadata: input.metadata,
                isEdited: true,
                editedAt: new Date(),
                editedById: actorId,
            },
        });

        await this.writeAuditLog({
            actorId,
            action: "TIMELINE_EVENT_UPDATED",
            targetType: "TimelineEvent",
            targetId: eventId,
            before,
            after,
            metadata: {
                loadId,
                reason: input.reason ?? null,
            },
        });

        return { event: after };
    }

    async deleteLoadEvent(actorId: string, loadId: string, eventId: string, input: any) {
        const before = await prisma.timelineEvent.findFirst({
            where: {
                id: eventId,
                loadId,
            },
        });

        if (!before) {
            throw new AppError(404, "Timeline event not found");
        }

        await prisma.timelineEvent.delete({
            where: { id: eventId },
        });

        await this.writeAuditLog({
            actorId,
            action: "TIMELINE_EVENT_DELETED",
            targetType: "TimelineEvent",
            targetId: eventId,
            before,
            metadata: {
                loadId,
                reason: input.reason ?? null,
            },
        });

        return {
            deleted: true,
            id: eventId,
        };
    }

    async listLoadDocuments(loadId: string) {
        await this.ensureLoadExists(loadId);

        const data = await prisma.attachment.findMany({
            where: { loadId },
            orderBy: { createdAt: "desc" },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return { data };
    }

    async getDocumentById(documentId: string) {
        const document = await prisma.attachment.findUnique({
            where: { id: documentId },
            include: {
                load: {
                    select: {
                        id: true,
                        loadNumber: true,
                        driverId: true,
                    },
                },
                timelineEvent: {
                    select: {
                        id: true,
                        type: true,
                        loadId: true,
                    },
                },
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!document) {
            throw new AppError(404, "Document not found");
        }

        return {
            document,
            downloadUrl: document.url,
        };
    }

    async deleteDocument(actorId: string, documentId: string, input: any) {
        const before = await prisma.attachment.findUnique({
            where: { id: documentId },
        });

        if (!before) {
            throw new AppError(404, "Document not found");
        }

        await prisma.attachment.delete({
            where: { id: documentId },
        });

        await this.writeAuditLog({
            actorId,
            action: "DOCUMENT_DELETED",
            targetType: "Attachment",
            targetId: documentId,
            before,
            metadata: {
                reason: input.reason ?? null,
            },
        });

        return {
            deleted: true,
            id: documentId,
        };
    }

    async listLoadExpenses(loadId: string) {
        await this.ensureLoadExists(loadId);

        const accessorials = await prisma.accessorial.findMany({
            where: {
                rateAgreement: {
                    is: {
                        loadId,
                    },
                },
            },
            orderBy: [
                { expenseDate: "desc" },
                { createdAt: "desc" },
            ],
            include: {
                attachment: true,
                rateAgreement: {
                    select: {
                        id: true,
                        load: {
                            select: {
                                id: true,
                                loadNumber: true,
                            },
                        },
                    },
                },
            },
        });

        const data = accessorials.map((item) => ({
            id: item.id,
            loadId: item.rateAgreement.load.id,
            loadNumber: item.rateAgreement.load.loadNumber,
            rateAgreementId: item.rateAgreementId,
            type: item.type,
            amount: Number(item.amount),
            currency: item.currency,
            vendor: item.vendor,
            location: item.location,
            expenseDate: item.expenseDate,
            notes: item.notes,
            attachment: item.attachment,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }));

        const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

        return {
            summary: {
                count: data.length,
                totalAmount,
                currency: "USD",
            },
            data,
        };
    }

    async createLoadExpense(actorId: string, loadId: string, input: any) {
        await this.ensureLoadExists(loadId);

        const rateAgreement = await this.findOrCreateRateAgreement(loadId);

        const normalized = normalizeExpenseType(input.type);

        const after = await prisma.accessorial.create({
            data: {
                rateAgreementId: rateAgreement.id,
                type: normalized.type,
                amount: Number(input.amount ?? 0),
                currency: String(input.currency ?? "USD").toUpperCase(),
                vendor: input.vendor ?? null,
                location: input.location ?? null,
                expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
                notes: buildExpenseNotes(input.notes, normalized.notesPrefix),
                attachmentId: input.attachmentId ?? null,
            },
        });

        await this.writeAuditLog({
            actorId,
            action: "EXPENSE_CREATED",
            targetType: "Accessorial",
            targetId: after.id,
            after,
            metadata: {
                loadId,
            },
        });

        return { expense: after };
    }

    async updateLoadExpense(
        actorId: string,
        loadId: string,
        expenseId: string,
        input: any
    ) {
        const before = await prisma.accessorial.findFirst({
            where: {
                id: expenseId,
                rateAgreement: {
                    is: {
                        loadId,
                    },
                },
            },
        });

        if (!before) {
            throw new AppError(404, "Expense not found");
        }

        const normalized =
            input.type !== undefined ? normalizeExpenseType(input.type) : null;

        const after = await prisma.accessorial.update({
            where: { id: expenseId },
            data: {
                type: normalized?.type,
                amount: input.amount !== undefined ? Number(input.amount) : undefined,
                currency:
                    input.currency !== undefined
                        ? String(input.currency).toUpperCase()
                        : undefined,
                vendor: input.vendor,
                location: input.location,
                expenseDate:
                    input.expenseDate !== undefined
                        ? input.expenseDate
                            ? new Date(input.expenseDate)
                            : null
                        : undefined,
                notes:
                    input.notes !== undefined || normalized?.notesPrefix
                        ? buildExpenseNotes(input.notes ?? before.notes, normalized?.notesPrefix ?? null)
                        : undefined,
                attachmentId:
                    input.attachmentId !== undefined ? input.attachmentId : undefined,
            },
        });

        await this.writeAuditLog({
            actorId,
            action: "EXPENSE_UPDATED",
            targetType: "Accessorial",
            targetId: expenseId,
            before,
            after,
            metadata: {
                loadId,
            },
        });

        return { expense: after };
    }

    async deleteLoadExpense(
        actorId: string,
        loadId: string,
        expenseId: string,
        input: any
    ) {
        const before = await prisma.accessorial.findFirst({
            where: {
                id: expenseId,
                rateAgreement: {
                    is: {
                        loadId,
                    },
                },
            },
        });

        if (!before) {
            throw new AppError(404, "Expense not found");
        }

        await prisma.accessorial.delete({
            where: { id: expenseId },
        });

        await this.writeAuditLog({
            actorId,
            action: "EXPENSE_DELETED",
            targetType: "Accessorial",
            targetId: expenseId,
            before,
            metadata: {
                loadId,
                reason: input.reason ?? null,
            },
        });

        return {
            deleted: true,
            id: expenseId,
        };
    }

    async listAuditLogs(input: PaginationInput & {
        action?: string;
        targetType?: string;
        targetId?: string;
        dateFrom?: string;
        dateTo?: string;
    }) {
        const page = toPage(input.page);
        const limit = toLimit(input.limit);
        const skip = (page - 1) * limit;

        const where: any = {};

        if (input.action) {
            where.action = input.action;
        }

        if (input.targetType) {
            where.targetType = input.targetType;
        }

        if (input.targetId) {
            where.targetId = input.targetId;
        }

        if (input.dateFrom || input.dateTo) {
            where.createdAt = {};

            if (input.dateFrom) {
                where.createdAt.gte = new Date(input.dateFrom);
            }

            if (input.dateTo) {
                where.createdAt.lte = new Date(input.dateTo);
            }
        }

        const [data, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    actor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getAuditLogById(id: string) {
        const auditLog = await prisma.auditLog.findUnique({
            where: { id },
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        if (!auditLog) {
            throw new AppError(404, "Audit log not found");
        }

        return { auditLog };
    }

    private async ensureLoadExists(loadId: string) {
        const load = await prisma.load.findUnique({
            where: { id: loadId },
            select: { id: true },
        });

        if (!load) {
            throw new AppError(404, "Load not found");
        }

        return load;
    }

    private async findOrCreateRateAgreement(loadId: string) {
        const existing = await prisma.rateAgreement.findUnique({
            where: { loadId },
            select: { id: true },
        });

        if (existing) {
            return existing;
        }

        return prisma.rateAgreement.create({
            data: {
                loadId,
                rateAmount: 0,
                rateType: "FLAT",
                paymentMethod: "STANDARD",
            },
            select: {
                id: true,
            },
        });
    }
}