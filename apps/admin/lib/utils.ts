import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "awaiting_payment" -> "Awaiting payment". CSS `capitalize` looks like the
// obvious tool for this but it title-cases every word ("Awaiting Payment"),
// which doesn't match this app's sentence-case convention everywhere else
// (headings, buttons, labels). Only the first letter of the whole phrase
// should be capitalized, so that has to happen in JS, not via text-transform.
export function toSentenceCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
