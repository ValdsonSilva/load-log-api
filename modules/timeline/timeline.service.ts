import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";
import { TimelineRepository } from "./timeline.repository.js";
import { stableStringify, sha256Hex } from "../../utils/hash.js";
import { Load, type TimelineEvent, TimelineEventType } from "../../lib/generated/prisma/index.js";

export class TimelineService {
    constructor(private repo = new TimelineRepository()) { }

    private async assertLoadOwned(userId: string, loadId: string) {
        const load = await prisma.load.findUnique({
            where: { id: loadId },
            select: { id: true, driverId: true },
        });
        if (!load) throw new AppError(404, "Load not found");
        if (load.driverId !== userId) throw new AppError(403, "Forbidden");
        return load;
    }

    // irei garantir que certos eventos não se repitam para a mesma carga
    private async assertEventOccuredAtUnique(
        loadId: string,
        type: TimelineEventType
    ): Promise<void> {

        const singleInstanceEvents: TimelineEventType[] = [
            "ARRIVED_AT_SHIPPER",
            "LEFT_SHIPPER",
            "ARRIVED_AT_RECEIVER",
            "LEFT_RECEIVER",
            "LOAD_COMPLETED"
        ];

        if (!singleInstanceEvents.includes(type)) return;

        const existing = await prisma.timelineEvent.findFirst({
            where: {
                loadId,
                type
            },
            select: { id: true }
        });

        if (existing) {
            throw new AppError(
                403,
                `O evento ${type} já foi registrado para esta carga`
            );
        }
    }

    async createEvent(userId: string, loadId: string, input: any) {
        await this.assertLoadOwned(userId, loadId);

        await this.assertEventOccuredAtUnique(loadId, input.type);

        return prisma.$transaction(async (tx: any) => {
            const last = await tx.timelineEvent.findFirst({
                where: { loadId },
                orderBy: [{ sequence: "desc" }],
                select: { sequence: true, hash: true },
            });

            const sequence = (last?.sequence ?? 0) + 1;
            const prevHash = last?.hash ?? null;

            const occurredAtUtc: Date = input.occurredAtUtc ?? new Date();

            // hash imutável do evento (criação)
            const hashPayload = {
                loadId,
                sequence,
                prevHash,
                type: input.type,
                source: input.source,
                occurredAtUtc: occurredAtUtc.toISOString(),
                timeZone: input.timeZone ?? "UTC",
                latitude: input.latitude ?? null,
                longitude: input.longitude ?? null,
                locationText: input.locationText ?? null,
                notes: input.notes ?? null,
                metadata: input.metadata ?? null,
            };

            const hash = sha256Hex(stableStringify(hashPayload));

            const ev = await tx.timelineEvent.create({
                data: {
                    loadId,
                    type: input.type,
                    source: input.source,
                    occurredAtUtc,
                    timeZone: input.timeZone ?? "UTC",

                    // Decimal: Prisma aceita string/Decimal. string é ok.
                    latitude: input.latitude != null ? String(input.latitude) : undefined,
                    longitude: input.longitude != null ? String(input.longitude) : undefined,

                    locationText: input.locationText,
                    notes: input.notes,
                    metadata: input.metadata,

                    sequence,
                    prevHash,
                    hash,
                    userId,
                },
            });

            return ev;
        });
    }

    async updateEvent(userId: string, eventId: string, input: any) {
        const ev = await prisma.timelineEvent.findUnique({
            where: { id: eventId },
            include: { load: { select: { id: true, driverId: true } } },
        });
        if (!ev) throw new AppError(404, "Event not found");
        if (ev.load.driverId !== userId) throw new AppError(403, "Forbidden");

        return prisma.$transaction(async (tx: any) => {
            const exportCount = await tx.loadExport.count({ where: { loadId: ev.loadId } });
            const wasEditedAfterExport = exportCount > 0;

            const previousData = {
                type: ev.type,
                source: ev.source,
                occurredAtUtc: ev.occurredAtUtc.toISOString(),
                timeZone: ev.timeZone,
                latitude: ev.latitude?.toString() ?? null,
                longitude: ev.longitude?.toString() ?? null,
                locationText: ev.locationText,
                notes: ev.notes,
                metadata: ev.metadata,
            };

            const newData = {
                ...previousData,
                ...{
                    type: input.type ?? previousData.type,
                    source: input.source ?? previousData.source,
                    occurredAtUtc: (input.occurredAtUtc ?? ev.occurredAtUtc).toISOString(),
                    timeZone: input.timeZone ?? previousData.timeZone,
                    latitude: input.latitude ?? previousData.latitude,
                    longitude: input.longitude ?? previousData.longitude,
                    locationText: input.locationText ?? previousData.locationText,
                    notes: input.notes ?? previousData.notes,
                    metadata: input.metadata ?? previousData.metadata,
                },
            };

            const revisionHash = sha256Hex(
                stableStringify({
                    eventId,
                    baseEventHash: ev.hash, // hash original do evento
                    editedAt: new Date().toISOString(),
                    previousData,
                    newData,
                })
            );

            await tx.timelineEventRevision.create({
                data: {
                    timelineEvent: { connect: { id: eventId } },
                    editedBy: { connect: { id: userId } },
                    previousData,
                    newData,
                    revisionHash,
                    wasEditedAfterExport,
                },
            });

            const updated = await tx.timelineEvent.update({
                where: { id: eventId },
                data: {
                    // marcação de edição
                    isEdited: true,
                    editedAt: new Date(),
                    editedById: userId,

                    // guarda “original occurredAt” na primeira edição
                    originalOccurredAtUtc: ev.originalOccurredAtUtc ?? ev.occurredAtUtc,
                    originalPayload: ev.originalPayload ?? previousData,

                    // aplica mudanças (o hash original permanece o mesmo)
                    type: input.type,
                    source: input.source,
                    occurredAtUtc: input.occurredAtUtc,
                    timeZone: input.timeZone,
                    latitude: input.latitude != null ? String(input.latitude) : undefined,
                    longitude: input.longitude != null ? String(input.longitude) : undefined,
                    locationText: input.locationText,
                    notes: input.notes,
                    metadata: input.metadata,
                },
            });

            return updated;
        });
    }

    async listEvents(userId: string, loadId: string) {
        await this.assertLoadOwned(userId, loadId);
        return prisma.timelineEvent.findMany({
            where: { loadId },
            orderBy: [{ occurredAtUtc: "asc" }],
            include: { attachments: true, revisions: true },
        });
    }

    async deleteEvent(userId: string, eventId: string) {
        const ev = await this.repo.findById(eventId);
        if (!ev) throw new AppError(404, "Event not found");
        if (ev.load.driverId !== userId) throw new AppError(403, "Forbidden");

        await this.repo.delete(eventId);
    }
}