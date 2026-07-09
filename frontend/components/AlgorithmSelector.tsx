import { ALGORITHMS, algorithmMeta } from "@/lib/algorithms";
import type { Algorithm } from "@/lib/types";

interface AlgorithmSelectorProps {
  selected: Algorithm;
  onSelect: (algorithm: Algorithm) => void;
}

export default function AlgorithmSelector({ selected, onSelect }: AlgorithmSelectorProps) {
  const selectedMeta = algorithmMeta(selected);

  return (
    <div className="space-y-2.5">
      <div className="flex rounded-xl bg-white/[0.03] p-1">
        {ALGORITHMS.map((algo) => {
          const isActive = algo.id === selected;
          return (
            <button
              key={algo.id}
              onClick={() => onSelect(algo.id)}
              aria-pressed={isActive}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/[0.09] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${algo.dot}`} />
              <span className="hidden sm:inline">{algo.name}</span>
              <span className="sm:hidden">{algo.shortName}</span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-sm text-slate-500">{selectedMeta.tagline}</p>
    </div>
  );
}
