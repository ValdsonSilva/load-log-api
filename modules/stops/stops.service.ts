import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";
import { StopsRepository } from "./stops.repository.js";

export class StopsService {
    constructor(private repo = new StopsRepository()) { }

    private async assertLoadOwned(userId: string, loadId: string) {
        const load = await prisma.load.findUnique({
            where: { id: loadId },
            select: { id: true, driverId: true },
        });
        if (!load) throw new AppError(404, "Load not found");
        if (load.driverId !== userId) throw new AppError(403, "Forbidden");
    }

    async createStop(userId: string, loadId: string, input: any) {
        await this.assertLoadOwned(userId, loadId);
        const seq = input.sequence ?? (await this.repo.nextSequence(loadId));

        return this.repo.create({
            load: { connect: { id: loadId } },
            type: input.type,
            sequence: seq,

            facilityName: input.facilityName,
            phone: input.phone,

            street1: input.street1,
            street2: input.street2,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            country: input.country,

            appointmentType: input.appointmentType,
            appointmentAt: input.appointmentAt,
            operatingHoursText: input.operatingHoursText,
            checkInInstructions: input.checkInInstructions,

            dockDoorInfo: input.dockDoorInfo,

            lumperRequired: input.lumperRequired,
            ppeRequired: input.ppeRequired,
            idRequired: input.idRequired,
            guardShackCheckIn: input.guardShackCheckIn,
            specialInstructions: input.specialInstructions,

            handlingType: input.handlingType,
        });
    }

    async listStops(userId: string, loadId: string) {
        await this.assertLoadOwned(userId, loadId);
        return this.repo.listByLoad(loadId);
    }

    async updateStop(userId: string, stopId: string, input: any) {
        const stop = await this.repo.findById(stopId);
        if (!stop) throw new AppError(404, "Stop not found");
        if (stop.load.driverId !== userId) throw new AppError(403, "Forbidden");

        return this.repo.update(stopId, input);
    }

    async deleteStop(userId: string, stopId: string) {
        const stop = await this.repo.findById(stopId);
        if (!stop) throw new AppError(404, "Stop not found");
        if (stop.load.driverId !== userId) throw new AppError(403, "Forbidden");

        await this.repo.delete(stopId);
    }
}