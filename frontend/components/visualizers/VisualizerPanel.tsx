import type { Algorithm, LogEntry } from "@/lib/types";
import WindowLogVisualizer from "./WindowLogVisualizer";
import WindowCounterVisualizer from "./WindowCounterVisualizer";
import TokenBucketVisualizer from "./TokenBucketVisualizer";
import LeakyBucketVisualizer from "./LeakyBucketVisualizer";

interface VisualizerPanelProps {
  algorithm: Algorithm;
  entries: LogEntry[];
  limit: number;
  windowSeconds: number;
  now: number;
}

export default function VisualizerPanel({
  algorithm,
  entries,
  limit,
  windowSeconds,
  now,
}: VisualizerPanelProps) {
  switch (algorithm) {
    case "sliding-window-log":
      return (
        <WindowLogVisualizer
          entries={entries}
          limit={limit}
          windowSeconds={windowSeconds}
          now={now}
        />
      );
    case "sliding-window-counter":
      return (
        <WindowCounterVisualizer
          entries={entries}
          limit={limit}
          windowSeconds={windowSeconds}
          now={now}
        />
      );
    case "token-bucket":
      return (
        <TokenBucketVisualizer
          entries={entries}
          limit={limit}
          windowSeconds={windowSeconds}
          now={now}
        />
      );
    case "leaky-bucket":
      return (
        <LeakyBucketVisualizer
          entries={entries}
          limit={limit}
          windowSeconds={windowSeconds}
          now={now}
        />
      );
  }
}
