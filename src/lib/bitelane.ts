/**
 * DoseChain bite lane — pure TypeScript, no database calls.
 * Rabies post-exposure courses per the National Guidelines on Rabies
 * Prophylaxis (NCDC/MoHFW): day 0 is immediate, follow-ups land on the
 * exact calendar day inside a shared-vial window, and a missed dose is
 * resumed — never restarted.
 */
import {
  addDays,
  diffDays,
  dow,
  type ISODate,
} from "./dosechain";

/** weekday (0=Sun) → list of [start, end] windows, e.g. ["10:00","10:45"] */
export type BiteWindows = Record<number, [string, string][]>;

export interface BiteDosePlan {
  offset: number;
  date: ISODate;
  /** null for day 0 (immediate walk-in) */
  window: [string, string] | null;
  flag?: "extra_window_needed";
}

export function planBiteCourse(
  bittenOn: ISODate,
  offsets: number[],
  windows: BiteWindows,
  holidays: ISODate[],
  prefer: "morning" | "evening" = "morning",
): BiteDosePlan[] {
  return offsets.map((off) => {
    const date = addDays(bittenOn, off);
    if (off === 0) return { offset: 0, date, window: null };
    const dayWins = windows[dow(date)] ?? [];
    if (dayWins.length === 0 || holidays.includes(date)) {
      // Never silently shift a rabies dose — suggest an extra window instead.
      return { offset: off, date, window: null, flag: "extra_window_needed" as const };
    }
    const win = prefer === "evening" ? dayWins[dayWins.length - 1] : dayWins[0];
    return { offset: off, date, window: win };
  });
}

/**
 * A dose was missed: rebook it at the next available window (today if one
 * exists, else the next day with a window) and shift every later dose by the
 * same number of days so day-gaps are preserved from the dose actually given.
 */
export function rescheduleMissedDose(
  doses: BiteDosePlan[],
  missedIndex: number,
  today: ISODate,
  windows: BiteWindows,
  holidays: ISODate[],
): BiteDosePlan[] {
  const missed = doses[missedIndex];
  let newDate = today < missed.date ? missed.date : today;
  while ((windows[dow(newDate)] ?? []).length === 0 || holidays.includes(newDate)) {
    newDate = addDays(newDate, 1);
  }
  const shift = diffDays(newDate, missed.date);
  return doses.map((d, i) => {
    if (i < missedIndex) return d;
    const date = addDays(d.date, shift);
    const dayWins = windows[dow(date)] ?? [];
    const window: [string, string] | null =
      d.offset === 0 ? null : dayWins.length > 0 ? dayWins[0] : null;
    return {
      ...d,
      date,
      window,
      flag: dayWins.length === 0 && d.offset !== 0 ? ("extra_window_needed" as const) : undefined,
    };
  });
}
