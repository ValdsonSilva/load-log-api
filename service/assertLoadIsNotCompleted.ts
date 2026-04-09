import { AppError } from "../utils/error";

export async function assertLoadIsNotCompleted(loadId: string, repository: any, message: string) {
    const lastEvent = await repository.lastEventForLoad(loadId);

    if (lastEvent?.type === "LOAD_COMPLETED") {
        throw new AppError(403, message);
    }
}