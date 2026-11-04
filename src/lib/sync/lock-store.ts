"use client";

import { useSyncExternalStore } from "react";

export type JourneyLockStatus = "idle" | "acquiring" | "held" | "blocked";

type LockState = Record<string, { status: JourneyLockStatus; reason?: string }>;

type Listener = () => void;

let snapshot: LockState = {};
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeLockState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLockSnapshot(): LockState {
  return snapshot;
}

export function getLockServerSnapshot(): LockState {
  return {};
}

export function setJourneyLockStatus(journeyId: string, status: JourneyLockStatus, reason?: string): void {
  const prev = snapshot[journeyId];
  if (prev?.status === status && prev.reason === reason) return;
  snapshot = { ...snapshot, [journeyId]: { status, reason } };
  emit();
}

export function clearJourneyLockStatus(journeyId: string): void {
  if (!snapshot[journeyId]) return;
  const next = { ...snapshot };
  delete next[journeyId];
  snapshot = next;
  emit();
}

export function useJourneyLock(journeyId: string): { status: JourneyLockStatus; reason?: string } {
  const state = useSyncExternalStore(subscribeLockState, getLockSnapshot, getLockServerSnapshot);
  return state[journeyId] ?? { status: "idle" };
}
