const haltedPipeIds = new Set<string>();

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

export function setPipeHalted(id: string, halted: boolean): void {
  const key = normalizeId(id);
  if (!key) {
    return;
  }

  if (halted) {
    haltedPipeIds.add(key);
    return;
  }

  haltedPipeIds.delete(key);
}

export function isPipeHalted(id: string): boolean {
  return haltedPipeIds.has(normalizeId(id));
}

export function listHaltedPipes(): string[] {
  return Array.from(haltedPipeIds.values());
}

