import { DRAFT_KEY, STORAGE_KEY } from "@/lib/constants";
import { createInitialState, hydrateState } from "@/lib/domain";
import type { AppState } from "@/lib/types";

type Listener = () => void;

let snapshot: AppState | null = null;
let booted = false;
let bootScheduled = false;
const listeners = new Set<Listener>();

function readStoredState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? hydrateState(JSON.parse(raw)) : createInitialState();
  } catch {
    return createInitialState();
  }
}

export function subscribeAppState(listener: Listener): () => void {
  listeners.add(listener);
  if (!booted && !bootScheduled && typeof window !== "undefined") {
    bootScheduled = true;
    queueMicrotask(() => {
      if (booted) return;
      snapshot = readStoredState();
      booted = true;
      listeners.forEach((entry) => entry());
    });
  }
  return () => listeners.delete(listener);
}

export function getAppSnapshot(): AppState | null {
  return booted ? snapshot : null;
}

export function getAppServerSnapshot(): AppState | null {
  return null;
}

export function updateAppState(recipe: (current: AppState) => AppState): void {
  const current = snapshot ?? readStoredState();
  const next = recipe(current);
  booted = true;
  if (next === current) return;
  snapshot = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  listeners.forEach((listener) => listener());
}

let draftSnapshot: DraftRecord | null = null;
let draftBooted = false;
let draftBootScheduled = false;
const draftListeners = new Set<Listener>();

export type DraftRecord = Record<string, unknown>;

export function subscribeDraft(listener: Listener): () => void {
  draftListeners.add(listener);
  if (!draftBooted && !draftBootScheduled && typeof window !== "undefined") {
    draftBootScheduled = true;
    queueMicrotask(() => {
      if (draftBooted) return;
      draftSnapshot = readDraft();
      draftBooted = true;
      draftListeners.forEach((entry) => entry());
    });
  }
  return () => draftListeners.delete(listener);
}

export function getDraftSnapshot(): DraftRecord | null {
  return draftBooted ? draftSnapshot : null;
}

export function getDraftServerSnapshot(): DraftRecord | null {
  return null;
}

export function writeDraft(next: DraftRecord): void {
  draftSnapshot = next;
  draftBooted = true;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  draftListeners.forEach((listener) => listener());
}

export function clearDraft(): void {
  draftSnapshot = null;
  draftBooted = true;
  sessionStorage.removeItem(DRAFT_KEY);
  draftListeners.forEach((listener) => listener());
}

function readDraft(): DraftRecord | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftRecord;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
