/** Shared input rules (client + server). Indian mobile: 10 digits starting 6–9, stored as +91XXXXXXXXXX. */
import { z } from "zod";

export const LIMITS = { name: 80, clinicName: 120, city: 80, shortText: 120, longText: 1000 } as const;

export function mobileDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}
export function isValidMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}
export const indianMobile = z
  .string()
  .transform((s) => mobileDigits(s))
  .refine(isValidMobile, { message: "Enter a valid 10-digit Indian mobile number" })
  .transform((d) => `+91${d}`);

export const personName = z.string().trim().min(1).max(LIMITS.name).regex(/^[\p{L}\p{M} .'-]+$/u, "Use letters only");
