"use client";

import { BAG_TYPES } from "@/lib/constants";
import type { BagType } from "@/lib/types";
import { BagGlyph, bagLabel } from "@/components/ui";

export type StudioBag = {
  localId: string;
  name: string;
  type: BagType;
  color: string;
};

export function BagStudio({
  bags,
  bagType,
  editingBagId,
  onSelectType,
  onAdd,
  onWear,
}: {
  bags: StudioBag[];
  bagType: BagType;
  editingBagId: string | null;
  onSelectType: (type: BagType) => void;
  onAdd: () => void;
  onWear: (localId: string) => void;
}) {
  const counts = new Map<BagType, number>();
  for (const bag of bags) counts.set(bag.type, (counts.get(bag.type) ?? 0) + 1);

  const owned = BAG_TYPES.flatMap((type) => {
    const items = bags.filter((bag) => bag.type === type.id);
    if (items.length === 0) return [];
    const active = items.find((bag) => bag.localId === editingBagId) ?? items[items.length - 1];
    const sameName = items.every((bag) => bag.name === items[0].name);
    return [{ type, active, count: items.length, label: sameName ? items[0].name : type.label }];
  });

  return (
    <div className="bag-studio">
      <div className="bag-stage" aria-label="人物">
        <svg className="traveler" viewBox="0 0 160 220" aria-hidden="true">
          <rect x="52" y="16" width="56" height="52" rx="8" fill="#f4efe4" stroke="#111" strokeWidth="3" />
          <rect x="46" y="74" width="68" height="78" rx="10" fill="#f4efe4" stroke="#111" strokeWidth="3" />
          <path d="M48 92H28v28h20M112 92h20v28h-20" fill="none" stroke="#111" strokeWidth="3" />
          <path d="M70 152v40M90 152v40" fill="none" stroke="#111" strokeWidth="3" />
        </svg>
      </div>
      <div className="bag-owned" aria-label="已加入的包包" data-testid="owned-bags">
        {owned.map((row) => (
          <button
            key={row.type.id}
            type="button"
            className="bag-owned-row"
            data-testid={`owned-${row.type.id}`}
            aria-pressed={row.active.localId === editingBagId}
            onClick={() => onWear(row.active.localId)}
          >
            <span>
              {row.label}
              {row.count > 1 ? ` X${row.count}` : ""}
            </span>
            <BagGlyph type={row.type.id} />
          </button>
        ))}
      </div>
      <div className="bag-rail" aria-label="包包種類">
        {BAG_TYPES.map((type) => {
          const count = counts.get(type.id) ?? 0;
          return (
            <button
              key={type.id}
              type="button"
              className="bag-type"
              data-testid={`bag-type-${type.id}`}
              aria-pressed={bagType === type.id}
              onClick={() => onSelectType(type.id)}
            >
              <BagGlyph type={type.id} size={36} />
              <span>
                {type.label}
                {count > 0 ? ` X${count}` : ""}
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className="bag-plus" data-testid="add-bag" aria-label={`加入${bagLabel(bagType)}`} onClick={onAdd}>
        +
      </button>
    </div>
  );
}
