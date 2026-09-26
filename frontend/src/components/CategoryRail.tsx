"use client";
import { CATEGORIES } from '@/lib/pulse';

type Props = {
  selected: string;
  counts: Record<string, number>;
  totalActive: number;
  onSelect: (key: string) => void;
};

function CategoryRail({ selected, counts, totalActive, onSelect }: Props) {
  const chips = [
    { key: 'all', label: 'All', color: '#93a0b8', count: totalActive },
    ...CATEGORIES.map(c => ({ ...c, count: counts[c.key] ?? 0 })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Poll categories">
      {chips.map(chip => {
        const active = selected === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(chip.key)}
            className="pl-chip"
            style={{
              borderColor: active ? chip.color : '#1a2235',
              background: active ? `${chip.color}1a` : '#0b111e',
              color: active ? '#e8edf7' : '#93a0b8',
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: chip.color }}
              aria-hidden="true"
            />
            {chip.label}
            <span className="font-mono text-[11px] tabular-nums text-[#64748b]">{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default CategoryRail;
