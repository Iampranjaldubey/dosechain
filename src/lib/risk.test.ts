import { describe, expect, it } from "vitest";
import { riskScore } from "./risk";

describe("riskScore", () => {
  it("confirmed, prepaid visit is low risk", () => {
    const r = riskScore({ kind: "vaccine", daysOverdue: 0, pastMisses: 0, unansweredReminders: 0, confirmed: true, paid: true });
    expect(r.level).toBe("low");
    expect(r.score).toBe(0);
  });
  it("missed cat-3 bite dose with silence is high risk", () => {
    const r = riskScore({ kind: "bite", daysOverdue: 1, pastMisses: 1, unansweredReminders: 1, biteCategory: 3, confirmed: false, paid: false });
    expect(r.level).toBe("high");
    expect(r.reasons).toContain("Category 3 bite — high stakes");
  });
  it("score is clamped to 100", () => {
    const r = riskScore({ kind: "bite", daysOverdue: 30, pastMisses: 5, unansweredReminders: 5, biteCategory: 3, confirmed: false, paid: false });
    expect(r.score).toBe(100);
  });
});
