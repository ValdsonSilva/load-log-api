import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";

type ListExpensesInput = {
    userId: string;
    loadId?: string;
    type?: string;
    from?: Date;
    to?: Date;
};

type CreateExpenseInput = {
    userId: string;
    loadId: string;
    type: any;
    amount: number;
    currency: string;
    vendor?: string | null;
    location?: string | null;
    expenseDate: Date;
    notes?: string | null;
};

type UpdateExpenseInput = {
    userId: string;
    id: string;
    loadId?: string;
    type?: any;
    amount?: number;
    currency?: string;
    vendor?: string | null;
    location?: string | null;
    expenseDate?: Date;
    notes?: string | null;
};

export class ExpensesService {
    async list(input: ListExpensesInput) {
        const where: any = {
            rateAgreement: {
                load: {
                    userId: input.userId,
                },
            },
        };

        if (input.loadId) {
            where.rateAgreement.load.id = input.loadId;
        }

        if (input.type) {
            where.type = input.type;
        }

        if (input.from || input.to) {
            where.expenseDate = {};

            if (input.from) {
                where.expenseDate.gte = input.from;
            }

            if (input.to) {
                where.expenseDate.lte = input.to;
            }
        }

        const accessorials = await prisma.accessorial.findMany({
            where,
            include: {
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
            orderBy: [
                {
                    expenseDate: "desc",
                },
                {
                    createdAt: "desc",
                },
            ],
        });

        const data = accessorials.map((item) => this.toExpenseResponse(item));

        const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

        const totalFuelAmount = data
            .filter((item) => item.type === "FUEL")
            .reduce((sum, item) => sum + item.amount, 0);

        return {
            summary: {
                count: data.length,
                totalAmount,
                totalFuelAmount,
                currency: "USD",
            },
            data,
        };
    }

    async create(input: CreateExpenseInput) {
        const rateAgreement = await this.findRateAgreementForUserLoad(
            input.loadId,
            input.userId
        );

        const accessorial = await prisma.accessorial.create({
            data: {
                rateAgreementId: rateAgreement.id,
                type: input.type,
                amount: input.amount,
                currency: input.currency.toUpperCase(),
                vendor: this.nullableString(input.vendor),
                location: this.nullableString(input.location),
                expenseDate: input.expenseDate,
                notes: this.nullableString(input.notes),
            },
            include: {
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

        return this.toExpenseResponse(accessorial);
    }

    async update(input: UpdateExpenseInput) {
        const existing = await prisma.accessorial.findFirst({
            where: {
                id: input.id,
                rateAgreement: {
                    load: {
                        driverId: input.userId,
                    },
                },
            },
            include: {
                rateAgreement: {
                    select: {
                        id: true,
                        load: {
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });

        if (!existing) {
            throw new AppError(404, "Expense not found");
        }

        let nextRateAgreementId: string | undefined;

        if (input.loadId) {
            const nextRateAgreement = await this.findRateAgreementForUserLoad(
                input.loadId,
                input.userId
            );

            nextRateAgreementId = nextRateAgreement.id;
        }

        const accessorial = await prisma.accessorial.update({
            where: {
                id: input.id,
            },
            data: {
                rateAgreementId: nextRateAgreementId,
                type: input.type,
                amount: input.amount,
                currency: input.currency?.toUpperCase(),
                vendor: input.vendor === undefined ? undefined : this.nullableString(input.vendor),
                location:
                    input.location === undefined ? undefined : this.nullableString(input.location),
                expenseDate: input.expenseDate,
                notes: input.notes === undefined ? undefined : this.nullableString(input.notes),
            },
            include: {
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

        return this.toExpenseResponse(accessorial);
    }

    async delete(input: { userId: string; id: string }) {
        const existing = await prisma.accessorial.findFirst({
            where: {
                id: input.id,
                rateAgreement: {
                    load: {
                        driverId: input.userId,
                    },
                },
            },
            select: {
                id: true,
            },
        });

        if (!existing) {
            throw new AppError(404, "Expense not found");
        }

        await prisma.accessorial.delete({
            where: {
                id: input.id,
            },
        });

        return {
            deleted: true,
            id: input.id,
        };
    }

    private async findRateAgreementForUserLoad(loadId: string, userId: string) {
        const rateAgreement = await prisma.rateAgreement.findFirst({
            where: {
                load: {
                    id: loadId,
                    driverId: userId,
                },
            },
            select: {
                id: true,
                load: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!rateAgreement) {
            throw new AppError(
                404,
                "Load or rate agreement not found for authenticated user"
            );
        }

        return rateAgreement;
    }

    private toExpenseResponse(accessorial: any) {
        return {
            id: accessorial.id,
            loadId: accessorial.rateAgreement?.load?.id ?? null,
            loadNumber: accessorial.rateAgreement?.load?.loadNumber ?? null,
            rateAgreementId: accessorial.rateAgreementId,

            type: accessorial.type,
            amount: Number(accessorial.amount),
            currency: accessorial.currency,

            vendor: accessorial.vendor ?? null,
            location: accessorial.location ?? null,
            expenseDate: accessorial.expenseDate ?? accessorial.createdAt,
            notes: accessorial.notes ?? null,

            createdAt: accessorial.createdAt,
            updatedAt: accessorial.updatedAt,
        };
    }

    private nullableString(value?: string | null) {
        if (value === undefined || value === null) {
            return null;
        }

        const trimmed = value.trim();

        return trimmed ? trimmed : null;
    }
}