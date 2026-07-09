import { ALGORITHMS } from "@/lib/algorithms";
import type { Algorithm } from "@/lib/types";

interface AlgorithmSelectorProps {
  selected: Algorithm;
  onSelect: (algorithm: Algorithm) => void;
}

export default function AlgorithmSelector({ selected, onSelect }: AlgorithmSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ALGORITHMS.map((algo) => {
        const isActive = algo.id === selected;
        return (
          <button
            key={algo.id}
            onClick={() => onSelect(algo.id)}
            aria-pressed={isActive}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              isActive
                ? `${algo.accent.border} ${algo.accent.bg}`
                : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${algo.accent.dot}`} />
              <span
                className={`text-sm font-semibold ${
                  isActive ? algo.accent.text : "text-slate-200"
                }`}
              >
                {algo.name}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{algo.tagline}</p>
          </button>
        );
      })}
    </div>
  );
}
