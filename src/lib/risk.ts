/** Transparent no-show risk score (0–100) with human-readable reasons. Pure — tested. */
export interface RiskInput {
  kind: "vaccine" | "bite";
  daysOverdue: number; // >0 when the due dose is past
  pastMisses: number;
  unansweredReminders: number;
  biteCategory?: number | null;
  confirmed: boolean;
  paid: boolean;
}
export interface RiskResult {
  score: number;
  level: "low" | "medium" | "high";
  reasons: string[];
}

export function riskScore(i: RiskInput): RiskResult {
  let s = 10;
  const reasons: string[] = [];
  if (i.daysOverdue > 0) {
    s += Math.min(35, 10 + i.daysOverdue * 3);
    reasons.push(`${i.daysOverdue}d overdue`);
  }
  if (i.pastMisses > 0) {
    s += Math.min(25, i.pastMisses * 12);
    reasons.push(`${i.pastMisses} past miss${i.pastMisses > 1 ? "es" : ""}`);
  }
  if (i.unansweredReminders > 0) {
    s += Math.min(20, i.unansweredReminders * 10);
    reasons.push(`${i.unansweredReminders} reminder${i.unansweredReminders > 1 ? "s" : ""} unanswered`);
  }
  if (i.kind === "bite" && (i.biteCategory ?? 0) >= 3) {
    s += 10;
    reasons.push("Category 3 bite — high stakes");
  }
  if (i.confirmed) {
    s -= 20;
    reasons.push("Parent confirmed");
  }
  if (i.paid) {
    s -= 15;
    reasons.push("Prepaid via UPI");
  }
  const score = Math.max(0, Math.min(100, s));
  return { score, level: score >= 55 ? "high" : score >= 30 ? "medium" : "low", reasons };
}
