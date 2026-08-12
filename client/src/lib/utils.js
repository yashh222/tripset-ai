import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge conditional class names, resolving Tailwind conflicts.
 * @param  {...any} inputs
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
