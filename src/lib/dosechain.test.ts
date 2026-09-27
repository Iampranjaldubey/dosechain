import { describe, expect, it } from "vitest";
import {
  addDays,
  buildPlan,
  diffDays,
  dow,
  reshuffle,
  type DoseDef,
  type EngineSettings,
  type GivenDose,
} from "./dosechain";
import { planBiteCourse, rescheduleMissedDose, type BiteWindows } from "./bitelane";

const SETTINGS: EngineSettings = {
  opdDays: [1, 2, 3, 4, 5, 6], // Mon–Sat
  holidays: [],
  rotaBrand: "RV5",
  hepaType: "inactivated",
};

// Subset of the seed catalogue (codes, series, ages in days) used by the tests.
const CAT: DoseDef[] = [
  { code: "BCG", series: "bcg", recAgeD: 0, minAgeD: 0, minGapPrevD: null, isLive: false },
  { code: "OPV0", series: "opv", recAgeD: 0, minAgeD: 0, minGapPrevD: null, isLive: false },
  { code: "HEPB1", series: "hepb", recAgeD: 0, minAgeD: 0, minGapPrevD: null, isLive: false },
  { code: "DTP1", series: "dtp", recAgeD: 42, minAgeD: 42, minGapPrevD: null, isLive: false },
  { code: "IPV1", series: "ipv", recAgeD: 42, minAgeD: 42, minGapPrevD: null, isLive: false },
  { code: "HIB1", series: "hib", recAgeD: 42, minAgeD: 42, minGapPrevD: null, isLive: false },
  { code: "ROTA1", series: "rota", recAgeD: 42, minAgeD: 42, minGapPrevD: null, isLive: false },
  { code: "PCV1", series: "pcv", recAgeD: 42, minAgeD: 42, minGapPrevD: null, isLive: false },
  { code: "HEPB2", series: "hepb", recAgeD: 42, minAgeD: 28, minGapPrevD: 28, isLive: false },
  { code: "DTP2", series: "dtp", recAgeD: 70, minAgeD: 70, minGapPrevD: 28, isLive: false },
  { code: "IPV2", series: "ipv", recAgeD: 70, minAgeD: 70, minGapPrevD: 28, isLive: false },
  { code: "HIB2", series: "hib", recAgeD: 70, minAgeD: 70, minGapPrevD: 28, isLive: false },
  { code: "ROTA2", series: "rota", recAgeD: 70, minAgeD: 70, minGapPrevD: 28, isLive: false },
  { code: "PCV2", series: "pcv", recAgeD: 70, minAgeD: 70, minGapPrevD: 28, isLive: false },
  { code: "DTP3", series: "dtp", recAgeD: 98, minAgeD: 98, minGapPrevD: 28, isLive: false },
  { code: "IPV3", series: "ipv", recAgeD: 98, minAgeD: 98, minGapPrevD: 28, isLive: false },
  { code: "HIB3", series: "hib", recAgeD: 98, minAgeD: 98, minGapPrevD: 28, isLive: false },
  { code: "ROTA3", series: "rota", recAgeD: 98, minAgeD: 98, minGapPrevD: 28, isLive: false },
  { code: "PCV3", series: "pcv", recAgeD: 98, minAgeD: 98, minGapPrevD: 28, isLive: false },
  { code: "FLU1", series: "flu", recAgeD: 182, minAgeD: 182, minGapPrevD: null, isLive: false },
  { code: "FLU2", series: "flu", recAgeD: 210, minAgeD: 210, minGapPrevD: 28, isLive: false },
  { code: "MMR1", series: "mmr", recAgeD: 274, minAgeD: 274, minGapPrevD: null, isLive: true },
  { code: "VAR1", series: "var", recAgeD: 456, minAgeD: 365, minGapPrevD: null, isLive: true },
  { code: "HEPA1", series: "hepa", recAgeD: 365, minAgeD: 365, minGapPrevD: null, isLive: false },
  { code: "HEPA2", series: "hepa", recAgeD: 548, minAgeD: 548, minGapPrevD: 180, isLive: false },
];

function givenOn(dob: string, ageD: number): string {
  return addDays(dob, ageD);
}

describe("dosechain engine", () => {
  it("1. fresh newborn: 6w/10w/14w visits land on correct dates, never on Sunday", () => {
    const dob = "2026-08-15";
    const today = "2026-08-20";
    const plan = buildPlan(dob, [], CAT, SETTINGS, today);
    const visitOf = (code: string) => plan.find((v) => v.doses.includes(code))!;
    expect(visitOf("DTP1").date).toBe("2026-09-26"); // dob+42, Saturday
    expect(visitOf("DTP2").date).toBe("2026-10-24"); // dob+70
    expect(visitOf("DTP3").date).toBe("2026-11-21"); // dob+98
    for (const v of plan) expect(dow(v.date)).not.toBe(0);
    // series gaps respected
    expect(diffDays(visitOf("DTP2").date, visitOf("DTP1").date)).toBeGreaterThanOrEqual(28);
    expect(diffDays(visitOf("DTP3").date, visitOf("DTP2").date)).toBeGreaterThanOrEqual(28);
  });

  it("snaps a dose targeting a Sunday forward to Monday", () => {
    const dob = "2026-08-02"; // dob+42 = 2026-09-13 (Sunday)
    const plan = buildPlan(dob, [], CAT, SETTINGS, "2026-08-05");
    const sixWeek = plan.find((v) => v.doses.includes("DTP1"))!;
    expect(sixWeek.date).toBe("2026-09-14"); // Monday
  });

  it("2. fever reshuffle: 10w visit +7d keeps the 14w gap ≥28d; 6m flu is untouched", () => {
    const dob = "2026-08-02";
    const history: GivenDose[] = CAT.filter((d) => d.recAgeD <= 42).map((d) => ({
      code: d.code,
      givenOn: givenOn(dob, d.recAgeD),
    }));
    const today = "2026-10-10";
    const plan = buildPlan(dob, history, CAT, SETTINGS, today);
    const tenWeekIdx = plan.findIndex((v) => v.doses.includes("DTP2"));
    const fluBefore = plan.find((v) => v.doses.includes("FLU1"))!.date;

    const res = reshuffle(dob, history, plan, tenWeekIdx, addDays(plan[tenWeekIdx].date, 7), CAT, SETTINGS, today);
    const visitOf = (code: string) => res.visits.find((v) => v.doses.includes(code))!;
    expect(diffDays(visitOf("DTP3").date, visitOf("DTP2").date)).toBeGreaterThanOrEqual(28);
    expect(visitOf("FLU1").date).toBe(fluBefore);
    expect(res.diff.length).toBeGreaterThan(0);
  });

  it("3. live rule: varicella 20d after MMR-1 is pushed to ≥28d (or same day)", () => {
    const mini: DoseDef[] = [
      { code: "MMR1", series: "mmr", recAgeD: 274, minAgeD: 274, minGapPrevD: null, isLive: true },
      { code: "VAR1", series: "var", recAgeD: 294, minAgeD: 274, minGapPrevD: null, isLive: true },
    ];
    const dob = "2026-01-01";
    const plan = buildPlan(dob, [], mini, SETTINGS, "2026-09-01");
    const mmr = plan.find((v) => v.doses.includes("MMR1"))!.date;
    const varicella = plan.find((v) => v.doses.includes("VAR1"))!.date;
    const gap = Math.abs(diffDays(varicella, mmr));
    expect(gap === 0 || gap >= 28).toBe(true);
    expect(gap).toBe(28);
  });

  it("4. HepA-2 is never less than 180 days after HepA-1", () => {
    const dob = "2026-01-01";
    const plan = buildPlan(dob, [], CAT, SETTINGS, "2026-01-10");
    const h1 = plan.find((v) => v.doses.includes("HEPA1"))!.date;
    const h2 = plan.find((v) => v.doses.includes("HEPA2"))!.date;
    expect(diffDays(h2, h1)).toBeGreaterThanOrEqual(180);
  });

  it("5. rota dose 1 beyond 105 days is flagged", () => {
    const dob = "2025-06-01";
    const plan = buildPlan(dob, [], CAT, SETTINGS, "2026-09-27");
    const rota1 = plan.find((v) => v.doses.includes("ROTA1"))!;
    expect(rota1.flags).toContain("rota_age_limit");
  });

  it("6. child with govt-centre 6w doses: plan starts at 10w with correct gaps", () => {
    const dob = "2026-08-15";
    const history: GivenDose[] = CAT.filter((d) => d.recAgeD <= 42).map((d) => ({
      code: d.code,
      givenOn: givenOn(dob, d.recAgeD),
    }));
    const plan = buildPlan(dob, history, CAT, SETTINGS, "2026-09-27");
    expect(plan[0]!.doses).toContain("DTP2");
    expect(plan[0]!.doses).not.toContain("DTP1");
    expect(plan[0]!.date).toBe("2026-10-24"); // dob+70, ≥28d after 6w visit
    expect(plan[0]!.status).toBe("bookable");
  });
});

const WINDOWS: BiteWindows = {
  0: [["10:00", "11:00"]],
  1: [["10:00", "10:45"], ["17:30", "18:00"]],
  2: [["10:00", "10:45"], ["17:30", "18:00"]],
  3: [["10:00", "10:45"], ["17:30", "18:00"]],
  4: [["10:00", "10:45"], ["17:30", "18:00"]],
  5: [["10:00", "10:45"], ["17:30", "18:00"]],
  6: [["10:00", "10:45"], ["17:30", "18:00"]],
};

describe("bite lane engine", () => {
  it("7. ID course from Sunday 2026-09-27: exact calendar days, Sunday window used", () => {
    const doses = planBiteCourse("2026-09-27", [0, 3, 7, 28], WINDOWS, []);
    expect(doses.map((d) => d.date)).toEqual([
      "2026-09-27",
      "2026-09-30",
      "2026-10-04",
      "2026-10-25",
    ]);
    expect(doses[0]!.window).toBeNull(); // day 0 is immediate
    expect(doses[2]!.window).toEqual(["10:00", "11:00"]); // Sunday window
    expect(doses[3]!.window).toEqual(["10:00", "11:00"]); // Sunday window
    expect(doses[1]!.window).toEqual(["10:00", "10:45"]); // Wednesday morning
  });

  it("8. missed day-7 rebooks to the next window; day-28 keeps the 21-day gap", () => {
    const doses = planBiteCourse("2026-09-27", [0, 3, 7, 28], WINDOWS, []);
    // day-7 (2026-10-04) missed; today is 2026-10-05 (Monday, windows exist)
    const res = rescheduleMissedDose(doses, 2, "2026-10-05", WINDOWS, []);
    expect(res[2]!.date).toBe("2026-10-05");
    expect(res[2]!.window).toEqual(["10:00", "10:45"]);
    expect(diffDays(res[3]!.date, res[2]!.date)).toBe(21);
    // earlier doses untouched
    expect(res[0]!.date).toBe("2026-09-27");
    expect(res[1]!.date).toBe("2026-09-30");
  });
});
