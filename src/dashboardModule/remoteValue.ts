export type RemoteRecord = Record<string, unknown>;

export function isRemoteRecord(value: unknown): value is RemoteRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRemoteRecordArray(value: unknown): RemoteRecord[] {
  return Array.isArray(value) ? value.filter(isRemoteRecord) : [];
}

export function asRemoteString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function asRemoteNumber(value: unknown, fallback = 0) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function asRemoteBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = asRemoteString(value).toUpperCase();
  if (["Y", "TRUE", "ACTIVE", "1"].includes(normalized)) {
    return true;
  }
  if (["N", "FALSE", "INACTIVE", "0"].includes(normalized)) {
    return false;
  }
  return fallback;
}
