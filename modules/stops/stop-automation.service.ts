import { TimelineEventType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

type TimelineEventForStopAutomation = {
    id: string;
    loadId: string;
    type: string;
    occurredAt?: Date | string | null;
    occurredAtUtc?: Date | string | null;
    notes?: string | null;
    metadata?: any;
    locationText?: string | null;
};

type StopAutomationRule = {
    stopType: "PICKUP" | "DELIVERY";
    status: "ARRIVED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED";
    timestampField:
    | "actualArrivedAt"
    | "actualCheckedInAt"
    | "actualStartedAt"
    | "actualCompletedAt";
};

const EVENT_TO_STOP_RULE: Partial<Record<TimelineEventType, StopAutomationRule>> = {
    ARRIVED_AT_SHIPPER: {
        stopType: "PICKUP",
        status: "ARRIVED",
        timestampField: "actualArrivedAt",
    },

    CHECKED_IN: {
        stopType: "PICKUP",
        status: "CHECKED_IN",
        timestampField: "actualCheckedInAt",
    },

    DOOR_ASSIGNED: {
        stopType: "PICKUP",
        status: "IN_PROGRESS",
        timestampField: "actualStartedAt",
    },

    LOAD_START: {
        stopType: "PICKUP",
        status: "IN_PROGRESS",
        timestampField: "actualStartedAt",
    },

    LOAD_END: {
        stopType: "PICKUP",
        status: "COMPLETED",
        timestampField: "actualCompletedAt",
    },

    LEFT_SHIPPER: {
        stopType: "PICKUP",
        status: "COMPLETED",
        timestampField: "actualCompletedAt",
    },

    ARRIVED_AT_RECEIVER: {
        stopType: "DELIVERY",
        status: "ARRIVED",
        timestampField: "actualArrivedAt",
    },

    UNLOAD_START: {
        stopType: "DELIVERY",
        status: "IN_PROGRESS",
        timestampField: "actualStartedAt",
    },

    UNLOAD_END: {
        stopType: "DELIVERY",
        status: "COMPLETED",
        timestampField: "actualCompletedAt",
    },

    LEFT_RECEIVER: {
        stopType: "DELIVERY",
        status: "COMPLETED",
        timestampField: "actualCompletedAt",
    },

    LOAD_COMPLETED: {
        stopType: "DELIVERY",
        status: "COMPLETED",
        timestampField: "actualCompletedAt",
    },
};

export class StopAutomationService {
    async handleTimelineEvent(event: TimelineEventForStopAutomation) {
        return this.handleTimelineEventWithClient(prisma, event);
    }

    async handleTimelineEventWithTx(tx: any, event: TimelineEventForStopAutomation) {
        return this.handleTimelineEventWithClient(tx, event);
    }

    private getOccurredAt(event: TimelineEventForStopAutomation) {
        const value = event.occurredAtUtc ?? event.occurredAt;

        if (!value) return new Date();

        return value instanceof Date ? value : new Date(value);
    }

    private getDockDoorInfo(event: TimelineEventForStopAutomation) {
        const value = event.metadata?.dockDoorNumber;

        if (typeof value !== "string") {
            return null;
        }

        const trimmed = value.trim();

        return trimmed ? trimmed : null;
    }

    private getMetadataString(event: TimelineEventForStopAutomation, keys: string[]) {
        for (const key of keys) {
            const value = event.metadata?.[key];

            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }

        return null;
    }

    private async getNextSequence(db: any, loadId: string) {
        const lastStop = await db.stop.findFirst({
            where: { loadId },
            orderBy: { sequence: "desc" },
            select: { sequence: true },
        });

        return (lastStop?.sequence ?? 0) + 1;
    }

    private async findExistingStop(db: any, loadId: string, stopType: "PICKUP" | "DELIVERY") {
        return db.stop.findFirst({
            where: {
                loadId,
                type: stopType,
            },
            orderBy: {
                sequence: stopType === "PICKUP" ? "asc" : "desc",
            },
        });
    }

    private async createStopFromTimeline(
        db: any,
        event: TimelineEventForStopAutomation,
        rule: StopAutomationRule
    ) {
        const load = await db.load.findUnique({
            where: { id: event.loadId },
            select: {
                expectedPickupCity: true,
                expectedPickupState: true,
                expectedDeliveryCity: true,
                expectedDeliveryState: true,
            },
        });

        const isPickup = rule.stopType === "PICKUP";

        const facilityName =
            this.getMetadataString(event, ["facilityName", "shipperName", "receiverName"]) ??
            (isPickup ? "Auto-generated pickup stop" : "Auto-generated delivery stop");

        const street1 =
            this.getMetadataString(event, ["street1", "address", "addressLine1"]) ??
            event.locationText ??
            "Address not provided";

        const city =
            this.getMetadataString(event, ["city"]) ??
            (isPickup ? load?.expectedPickupCity : load?.expectedDeliveryCity) ??
            "Unknown";

        const state =
            this.getMetadataString(event, ["state"]) ??
            (isPickup ? load?.expectedPickupState : load?.expectedDeliveryState) ??
            "Unknown";

        const postalCode =
            this.getMetadataString(event, ["postalCode", "zip", "zipCode"]) ??
            "Unknown";

        const country =
            this.getMetadataString(event, ["country"]) ??
            "US";

        const sequence = await this.getNextSequence(db, event.loadId);

        return db.stop.create({
            data: {
                loadId: event.loadId,
                type: rule.stopType,
                sequence,

                facilityName,
                street1,
                city,
                state,
                postalCode,
                country,

                status: rule.status,
                lastTimelineEventId: event.id,
                autoUpdatedFromTimeline: true,
            },
        });
    }

    private async handleTimelineEventWithClient(
        db: any,
        event: TimelineEventForStopAutomation
    ) {
        const rule = EVENT_TO_STOP_RULE[event.type as TimelineEventType];

        if (!rule) {
            return null;
        }

        const occurredAt = this.getOccurredAt(event);

        let stop = await this.findExistingStop(db, event.loadId, rule.stopType);

        if (!stop) {
            stop = await this.createStopFromTimeline(db, event, rule);
        }

        const data: any = {
            status: rule.status,
            lastTimelineEventId: event.id,
            autoUpdatedFromTimeline: true,
        };

        data[rule.timestampField] = occurredAt;

        if (event.type === "DOOR_ASSIGNED") {
            const dockDoorInfo = this.getDockDoorInfo(event);

            if (dockDoorInfo) {
                data.dockDoorInfo = dockDoorInfo;
            }
        }

        return db.stop.update({
            where: {
                id: stop.id,
            },
            data,
        });
    }
}