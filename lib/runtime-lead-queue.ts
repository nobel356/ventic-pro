export const RUNTIME_PENDING_LEADS_KEY =
  "ventic_runtime_pending_leads_v1";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function readRuntimePendingLeads(
  storage: StorageLike,
) {
  const raw =
    storage.getItem(
      RUNTIME_PENDING_LEADS_KEY,
    );

  if (!raw) return [] as unknown[];

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function writeRuntimePendingLeads(
  storage: StorageLike,
  items: unknown[],
) {
  const safe = items.slice(-20);

  if (!safe.length) {
    storage.removeItem(
      RUNTIME_PENDING_LEADS_KEY,
    );
    return;
  }

  storage.setItem(
    RUNTIME_PENDING_LEADS_KEY,
    JSON.stringify(safe),
  );
}

export function enqueueRuntimePendingLead(
  storage: StorageLike,
  item: unknown,
) {
  const current =
    readRuntimePendingLeads(
      storage,
    );

  current.push(item);

  writeRuntimePendingLeads(
    storage,
    current,
  );
}
