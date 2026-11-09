import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display format for E.164 MK numbers stored without spaces. */
export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("389") && digits.length >= 11) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return e164;
}
