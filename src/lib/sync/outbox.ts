import { OUTBOX_KEY } from "@/lib/constants";

export type OutboxEntry = {
  id: string;
  journeyId: string;
  enqueuedAt: string;
  tries: number;
};

function readOutbox(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: OutboxEntry[]): void {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
}

export function enqueueJourneySync(journeyId: string): void {
  const entries = readOutbox().filter((entry) => entry.journeyId !== journeyId);
  entries.push({
    id: crypto.randomUUID(),
    journeyId,
    enqueuedAt: new Date().toISOString(),
    tries: 0,
  });
  writeOutbox(entries);
}

export function listOutbox(): OutboxEntry[] {
  return readOutbox();
}

export function removeOutboxJourney(journeyId: string): void {
  writeOutbox(readOutbox().filter((entry) => entry.journeyId !== journeyId));
}

export function bumpOutboxTries(journeyId: string): void {
  writeOutbox(
    readOutbox().map((entry) =>
      entry.journeyId === journeyId ? { ...entry, tries: entry.tries + 1 } : entry,
    ),
  );
}
