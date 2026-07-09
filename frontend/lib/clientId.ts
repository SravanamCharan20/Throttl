import { useSyncExternalStore } from "react";

function generateClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `dev-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `dev-${Math.random().toString(36).slice(2, 10)}`;
}

type Listener = () => void;

let currentClientId: string | null = null;
const listeners = new Set<Listener>();

function getSnapshot(): string {
  if (currentClientId === null) {
    currentClientId = generateClientId();
  }
  return currentClientId;
}

function getServerSnapshot(): null {
  return null;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function rotateClientId(): void {
  currentClientId = generateClientId();
  listeners.forEach((listener) => listener());
}

export function useClientId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
