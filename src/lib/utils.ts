import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Number formatter with a comma thousands separator, e.g. 1284 → "1,284".
 * `useGrouping: "always"` forces a separator even for 4-digit numbers.
 */
const numberFormatter = new Intl.NumberFormat("en-US", { useGrouping: "always" });

/** Format an integer/float with comma thousands separators, e.g. 1284 → "1,284". */
export function formatNumber(value: number, opts?: Intl.NumberFormatOptions) {
  if (opts) return new Intl.NumberFormat("en-US", { useGrouping: "always", ...opts }).format(value);
  return numberFormatter.format(value);
}
