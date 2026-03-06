import crypto from "crypto";

function sortObject(value: any): any {
    if (Array.isArray(value)) return value.map(sortObject);
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((acc: any, key) => {
                acc[key] = sortObject(value[key]);
                return acc;
            }, {});
    }
    return value;
}

export function stableStringify(obj: any) {
    return JSON.stringify(sortObject(obj));
}

export function sha256Hex(input: string | Buffer) {
    return crypto.createHash("sha256").update(input).digest("hex");
}
