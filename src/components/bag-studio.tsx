"use client";

import Image from "next/image";
import { BAG_TYPES } from "@/lib/constants";
import { getTraveler, travelers } from "@/lib/travelers";
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
  travelerId,
  onSelectType,
  onAdd,
  onWear,
  onSelectTraveler,
}: {
  bags: StudioBag[];
  bagType: BagType;
  editingBagId: string | null;
  travelerId: string;
  onSelectType: (type: BagType) => void;
  onAdd: () => void;
  onWear: (localId: string) => void;
  onSelectTraveler: (id: string) => void;
}) {
  const counts = new Map<BagType, number>();
  for (const bag of bags) counts.set(bag.type, (counts.get(bag.type) ?? 0) + 1);

  const traveler = getTraveler(travelerId);

  const owned = BAG_TYPES.flatMap((type) => {
    const items = bags.filter((bag) => bag.type === type.id);
    if (items.length === 0) return [];
    const active = items.find((bag) => bag.localId === editingBagId) ?? items[items.length - 1];
    const sameName = items.every((bag) => bag.name === items[0].name);
    return [{ type, active, count: items.length, label: sameName ? items[0].name : type.label }];
  });

  return (
    <div className="bag-studio ro-equip" data-testid="bag-studio">
      <div className="ro-titlebar">
        <span className="ro-titlebar-dot" aria-hidden="true" />
        <p className="ro-title">Equipment</p>
        <span className="ro-title-zh">裝備</span>
      </div>

      <div className="ro-equip-board">
        <section className="bag-stage" aria-label="角色">
          <div className="ro-stage-inner">
            <Image
              className="traveler"
              src={traveler.src}
              alt={traveler.name}
              width={192}
              height={288}
              unoptimized
              priority
            />
            <p className="ro-char-name">{traveler.name}</p>
          </div>
          <div className="traveler-picks" role="group" aria-label="更換人物">
            {travelers.map((option) => (
              <button
                key={option.id}
                type="button"
                className="traveler-pick"
                aria-pressed={option.id === traveler.id}
                aria-label={option.name}
                data-testid={`traveler-${option.id}`}
                onClick={() => onSelectTraveler(option.id)}
              >
                <Image src={option.src} alt="" width={40} height={60} unoptimized />
              </button>
            ))}
          </div>
        </section>

        <section className="bag-owned" aria-label="已裝備" data-testid="owned-bags">
          <p className="ro-panel-label">Item</p>
          {owned.length === 0 ? (
            <p className="ro-empty">尚未裝備包包。<br />下方選種類後按「裝備」。</p>
          ) : (
            owned.map((row) => (
              <button
                key={row.type.id}
                type="button"
                className="bag-owned-row"
                data-testid={`owned-${row.type.id}`}
                aria-pressed={row.active.localId === editingBagId}
                onClick={() => onWear(row.active.localId)}
              >
                <span className="bag-owned-label">
                  {row.label}
                  {row.count > 1 ? ` ×${row.count}` : ""}
                </span>
                <span className="ro-item-slot">
                  <BagGlyph type={row.type.id} size={40} />
                </span>
              </button>
            ))
          )}
        </section>
      </div>

      <section className="ro-inventory" aria-label="道具欄">
        <p className="ro-panel-label">Inventory</p>
        <div className="bag-rail">
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
                {count > 0 ? <span className="bag-count">{count}</span> : null}
                <span className="ro-item-slot">
                  <BagGlyph type={type.id} size={36} />
                </span>
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="bag-plus"
          data-testid="add-bag"
          aria-label={`裝備${bagLabel(bagType)}`}
          onClick={onAdd}
        >
          裝備「{bagLabel(bagType)}」
        </button>
      </section>
    </div>
  );
}
