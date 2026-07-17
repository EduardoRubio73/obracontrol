export function toggleId(ids: Set<string>, id: string, checked: boolean): Set<string> {
  const next = new Set(ids);
  if (checked) next.add(id);
  else next.delete(id);
  return next;
}

export function toggleAll(ids: Set<string>, targetIds: string[], checked: boolean): Set<string> {
  const next = new Set(ids);
  targetIds.forEach((id) => {
    if (checked) next.add(id);
    else next.delete(id);
  });
  return next;
}

export function pruneSelection(ids: Set<string>, validIds: string[]): Set<string> {
  const valid = new Set(validIds);
  const filtered = [...ids].filter((id) => valid.has(id));
  return filtered.length === ids.size ? ids : new Set(filtered);
}

export function partitionSettled(
  ids: string[],
  results: PromiseSettledResult<unknown>[],
): { succeeded: string[]; failed: string[] } {
  const succeeded = ids.filter((_, i) => results[i]?.status === "fulfilled");
  const failed = ids.filter((_, i) => results[i]?.status === "rejected");
  return { succeeded, failed };
}
