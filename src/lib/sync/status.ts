"use client";

import { useSyncExternalStore } from "react";

export type SyncNotice = {
  kind: "idle" | "syncing" | "offline" | "pending" | "conflict" | "error" | "ok";
  message: string;
};

type Listener = () => void;

let notice: SyncNotice = { kind: "idle", message: "" };
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSyncNotice(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSyncNotice(): SyncNotice {
  return notice;
}

export function getSyncNoticeServer(): SyncNotice {
  return { kind: "idle", message: "" };
}

export function setSyncNotice(next: SyncNotice): void {
  notice = next;
  emit();
}

export function useSyncNotice(): SyncNotice {
  return useSyncExternalStore(subscribeSyncNotice, getSyncNotice, getSyncNoticeServer);
}
