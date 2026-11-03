export const DEFAULT_LAYER_NAME = "General";
export const MAX_LAYER_NAME_LENGTH = 60;

export function normalizeLayerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Layer names are unique per timeline, ignoring case and extra spaces. */
export function layerNameKey(name: string): string {
  return normalizeLayerName(name).toLowerCase();
}
