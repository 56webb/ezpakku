export function categoryId(index: number): string {
  return `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

export function itemId(index: number): string {
  return `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}
