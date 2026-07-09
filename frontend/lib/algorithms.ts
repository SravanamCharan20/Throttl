import type { Algorithm } from "./types";

export interface AlgorithmAccentClasses {
  border: string;
  ring: string;
  text: string;
  dot: string;
  bar: string;
  bg: string;
}

export interface AlgorithmMeta {
  id: Algorithm;
  name: string;
  tagline: string;
  accent: AlgorithmAccentClasses;
}

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "sliding-window-log",
    name: "Sliding Window Log",
    tagline: "Remembers every request's timestamp for pixel-perfect accuracy.",
    accent: {
      border: "border-sky-500",
      ring: "ring-sky-500",
      text: "text-sky-300",
      dot: "bg-sky-400",
      bar: "bg-sky-500",
      bg: "bg-sky-500/10",
    },
  },
  {
    id: "sliding-window-counter",
    name: "Sliding Window Counter",
    tagline: "Approximates a sliding window cheaply by blending two fixed buckets.",
    accent: {
      border: "border-violet-500",
      ring: "ring-violet-500",
      text: "text-violet-300",
      dot: "bg-violet-400",
      bar: "bg-violet-500",
      bg: "bg-violet-500/10",
    },
  },
  {
    id: "token-bucket",
    name: "Token Bucket",
    tagline: "Rewards idle time with burst capacity.",
    accent: {
      border: "border-amber-500",
      ring: "ring-amber-500",
      text: "text-amber-300",
      dot: "bg-amber-400",
      bar: "bg-amber-500",
      bg: "bg-amber-500/10",
    },
  },
  {
    id: "leaky-bucket",
    name: "Leaky Bucket",
    tagline: "Smooths bursts into a steady, paced output.",
    accent: {
      border: "border-emerald-500",
      ring: "ring-emerald-500",
      text: "text-emerald-300",
      dot: "bg-emerald-400",
      bar: "bg-emerald-500",
      bg: "bg-emerald-500/10",
    },
  },
];

export function algorithmMeta(id: Algorithm): AlgorithmMeta {
  const meta = ALGORITHMS.find((a) => a.id === id);
  if (!meta) throw new Error(`Unknown algorithm: ${id}`);
  return meta;
}
