export type Filters = Record<string, string[]>;

export function encodeFilters(filters: Filters): string {
  return btoa(JSON.stringify(filters));
}

export function decodeFilters(encoded: string): Filters {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return {};
  }
}
