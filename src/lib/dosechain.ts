/**
 * DoseChain dose-chain engine — pure TypeScript, no database calls.
 * Plans a child's full vaccine series per IAP-ACVIP 2023 (birth → 6 y):
 * minimum ages, per-series minimum gaps, the live-vaccine 28-day rule,
 * greedy visit grouping, and snapping to clinic OPD days.
 */

export type ISODate = string; // YYYY-MM-DD

const DAY_MS = 86400000;

export function parseD(s: ISODate): Date {
  return new Date(s + "T00:00:00Z");
}
export function fmtD(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}
export function addDays(s: ISODate, n: number): ISODate {
  return fmtD(new Date(parseD(s).getTime() + n * DAY_MS));
}
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseD(a).getTime() - parseD(b).getTime()) / DAY_MS);
}
export function maxD(...ds: ISODate[]): ISODate {
  return ds.reduce((a, b) => (a >= b ? a : b));
}
/** 0 = Sunday … 6 = Saturday */
export function dow(s: ISODate): number {
  return parseD(s).getUTCDay();
}

export interface DoseDef {
  code: string;
  series: string;
  recAgeD: number;
  minAgeD: number;
  minGapPrevD: number | null;
  isLive: boolean;
}

export interface GivenDose {
  code: string;
  givenOn: ISODate;
}

export interface EngineSettings {
  /** Weekdays the OPD runs (0=Sun). Mon–Sat → [1,2,3,4,5,6] */
  opdDays: number[];
  holidays: ISODate[];
  rotaBrand: "RV5" | "RV1";
  hepaType: "inactivated" | "live";
}

export interface PlannedVisit {
  date: ISODate;
  doses: string[];
  status: "due" | "bookable" | "planned";
  flags: string[];
}

export interface PlanDiffEntry {
  dose: string;
  oldDate: ISODate;
  newDate: ISODate;
}

/** Snap a date forward to the next OPD day that is not a holiday. Never earlier. */
export function snapToOpd(date: ISODate, settings: EngineSettings): ISODate {
  let d = date;
  while (!settings.opdDays.includes(dow(d)) || settings.holidays.includes(d)) {
    d = addDays(d, 1);
  }
  return d;
}

function liveOkAt(date: ISODate, liveDates: ISODate[]): boolean {
  return liveDates.every((ld) => {
    const gap = Math.abs(diffDays(date, ld));
    return gap === 0 || gap >= 28;
  });
}

function pushLiveDate(date: ISODate, liveDates: ISODate[]): ISODate {
  let d = date;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = liveDates.find((ld) => {
      const gap = Math.abs(diffDays(d, ld));
      return gap !== 0 && gap < 28;
    });
    if (!clash) return d;
    d = addDays(clash, 28);
  }
}

export function buildPlan(
  dob: ISODate,
  history: GivenDose[],
  catalogue: DoseDef[],
  settings: EngineSettings,
  today: ISODate,
): PlannedVisit[] {
  const givenCodes = new Set(history.map((h) => h.code));
  let pending = catalogue.filter((d) => !givenCodes.has(d.code));
  if (settings.rotaBrand === "RV1") pending = pending.filter((d) => d.code !== "ROTA3");
  if (settings.hepaType === "live") pending = pending.filter((d) => d.code !== "HEPA2");
  pending = [...pending].sort((a, b) => a.recAgeD - b.recAgeD);

  const defByCode = new Map(catalogue.map((d) => [d.code, d]));
  const seriesLast: Record<string, ISODate> = {};
  const liveDates: ISODate[] = [];
  for (const h of history) {
    const def = defByCode.get(h.code);
    if (!def) continue;
    if (!seriesLast[def.series] || seriesLast[def.series] < h.givenOn)
      seriesLast[def.series] = h.givenOn;
    if (def.isLive) liveDates.push(h.givenOn);
  }

  const visits: PlannedVisit[] = [];

  const earliestFor = (d: DoseDef): ISODate => {
    let e = maxD(addDays(dob, d.minAgeD), today);
    const last = seriesLast[d.series];
    if (last && d.minGapPrevD != null) e = maxD(e, addDays(last, d.minGapPrevD));
    if (d.isLive) e = pushLiveDate(e, liveDates);
    return e;
  };

  for (const d of pending) {
    const e = earliestFor(d);
    const target = maxD(addDays(dob, d.recAgeD), e);
    const last = visits[visits.length - 1];
    let placed = false;
    if (last) {
      const gapOk =
        d.minGapPrevD == null ||
        !seriesLast[d.series] ||
        diffDays(last.date, seriesLast[d.series]) >= d.minGapPrevD;
      const liveOk = !d.isLive || liveOkAt(last.date, liveDates);
      if (e <= last.date && target <= addDays(last.date, 14) && gapOk && liveOk) {
        last.doses.push(d.code);
        seriesLast[d.series] = last.date;
        if (d.isLive) liveDates.push(last.date);
        placed = true;
      }
    }
    if (!placed) {
      let date = target;
      if (d.isLive) date = pushLiveDate(date, liveDates);
      date = snapToOpd(date, settings);
      visits.push({ date, doses: [d.code], status: "planned", flags: [] });
      seriesLast[d.series] = date;
      if (d.isLive) liveDates.push(date);
    }
  }

  if (visits.length > 0) {
    visits[0]!.status = visits[0]!.date <= today ? "due" : "bookable";
  }
  for (const v of visits) {
    if (diffDays(v.date, today) < -30) v.flags.push("overdue_30d");
  }
  const rota1 = visits.find((v) => v.doses.includes("ROTA1"));
  if (rota1 && diffDays(rota1.date, dob) > 105) rota1.flags.push("rota_age_limit");
  const overdueCount = visits.filter((v) => v.date < today).length;
  if (overdueCount > 1) visits[0]!.flags.push("catchup_needed");

  return visits;
}

export interface ReshuffleResult {
  visits: PlannedVisit[];
  diff: PlanDiffEntry[];
  stillOnTrack: boolean;
}

/**
 * Move one visit (fever / parent request) and recompute all later visits.
 * Earlier visits stay fixed; the moved date is bumped up to each dose's
 * earliest allowed date if needed.
 */
export function reshuffle(
  dob: ISODate,
  history: GivenDose[],
  visits: PlannedVisit[],
  visitIndex: number,
  requestedDate: ISODate,
  catalogue: DoseDef[],
  settings: EngineSettings,
  today: ISODate,
): ReshuffleResult {
  const fixedHistory: GivenDose[] = [...history];
  for (let i = 0; i < visitIndex; i++) {
    for (const code of visits[i]!.doses)
      fixedHistory.push({ code, givenOn: visits[i]!.date });
  }

  const defByCode = new Map(catalogue.map((d) => [d.code, d]));
  const movedDoses = visits[visitIndex]!.doses;

  // Earliest allowed date for the moved visit, given fixed earlier visits.
  const seriesLast: Record<string, ISODate> = {};
  for (const h of fixedHistory) {
    const def = defByCode.get(h.code);
    if (def && (!seriesLast[def.series] || (seriesLast[def.series] ?? "") < h.givenOn))
      seriesLast[def.series] = h.givenOn;
  }
  let movedDate = requestedDate;
  for (const code of movedDoses) {
    const def = defByCode.get(code);
    if (!def) continue;
    let e = maxD(addDays(dob, def.minAgeD), today);
    const last = seriesLast[def.series];
    if (last && def.minGapPrevD != null) e = maxD(e, addDays(last, def.minGapPrevD));
    movedDate = maxD(movedDate, e);
  }
  movedDate = snapToOpd(movedDate, settings);

  const historyWithMoved: GivenDose[] = [
    ...fixedHistory,
    ...movedDoses.map((code) => ({ code, givenOn: movedDate })),
  ];
  const later = buildPlan(dob, historyWithMoved, catalogue, settings, today);

  const newVisits: PlannedVisit[] = [
    ...visits.slice(0, visitIndex),
    { date: movedDate, doses: [...movedDoses], status: "bookable", flags: [] },
    ...later,
  ];

  const oldDateByDose = new Map<string, ISODate>();
  for (const v of visits) for (const c of v.doses) oldDateByDose.set(c, v.date);
  const diff: PlanDiffEntry[] = [];
  for (const v of newVisits) {
    for (const c of v.doses) {
      const old = oldDateByDose.get(c);
      if (old && old !== v.date) diff.push({ dose: c, oldDate: old, newDate: v.date });
    }
  }
  const stillOnTrack = newVisits.every((v) => !v.flags.includes("rota_age_limit"));

  return { visits: newVisits, diff, stillOnTrack };
}
