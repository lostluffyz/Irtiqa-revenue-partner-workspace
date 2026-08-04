/**
 * Merge class names, filtering out falsy values.
 * Lightweight alternative to clsx + tailwind-merge for MVP.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
