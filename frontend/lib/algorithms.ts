import type { Algorithm } from "./types";

export interface AlgorithmMeta {
  id: Algorithm;
  name: string;
  shortName: string;
  tagline: string;
  dot: string;
}

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "sliding-window-log",
    name: "Sliding Window Log",
    shortName: "Log",
    tagline: "Remembers every request's timestamp for pixel-perfect accuracy.",
    dot: "bg-sky-400",
  },
  {
    id: "sliding-window-counter",
    name: "Sliding Window Counter",
    shortName: "Counter",
    tagline: "Approximates a sliding window cheaply by blending two fixed buckets.",
    dot: "bg-violet-400",
  },
  {
    id: "token-bucket",
    name: "Token Bucket",
    shortName: "Token",
    tagline: "Rewards idle time with burst capacity.",
    dot: "bg-amber-400",
  },
  {
    id: "leaky-bucket",
    name: "Leaky Bucket",
    shortName: "Leaky",
    tagline: "Smooths bursts into a steady, paced output.",
    dot: "bg-emerald-400",
  },
];

export function algorithmMeta(id: Algorithm): AlgorithmMeta {
  const meta = ALGORITHMS.find((a) => a.id === id);
  if (!meta) throw new Error(`Unknown algorithm: ${id}`);
  return meta;
}
