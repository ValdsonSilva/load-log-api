import { TimelineEventType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

type TimelineEventForStopAutomation = {
    id: string;
    loadId: string;
    type: TimelineEventType;
    occurredAt?: Date | string | null;
    notes?: string | null;
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

    private async handleTimelineEventWithClient(
        db: typeof prisma,
        event: TimelineEventForStopAutomation
    ) {
        const rule = EVENT_TO_STOP_RULE[event.type];

        if (!rule) {
            return null;
        }

        const occurredAt = this.getOccurredAt(event);

        const stop = await db.stop.findFirst({
            where: {
                loadId: event.loadId,
                type: rule.stopType,
            },
            orderBy: {
                sequence: rule.stopType === "PICKUP" ? "asc" : "desc",
            },
        });

        if (!stop) {
            return null;
        }

        const data: any = {
            status: rule.status,
            lastTimelineEventId: event.id,
            autoUpdatedFromTimeline: true,
        };

        data[rule.timestampField] = occurredAt;

        return db.stop.update({
            where: {
                id: stop.id,
            },
            data,
        });
    }

    private getOccurredAt(event: TimelineEventForStopAutomation) {
        if (!event.occurredAt) return new Date();

        return event.occurredAt instanceof Date
            ? event.occurredAt
            : new Date(event.occurredAt);
    }
}