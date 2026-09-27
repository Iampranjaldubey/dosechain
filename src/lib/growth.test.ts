import { describe, expect, it } from "vitest";
import { crossingAlert, percentile, zScore } from "./growth";

describe("growth", () => {
  it("median weight at birth is ~50th percentile", () => {
    expect(percentile(zScore("weight", "M", 0, 3.3464))).toBeCloseTo(50, 0);
  });
  it("girls use girl tables", () => {
    expect(zScore("weight", "F", 12, 8.9481)).toBeCloseTo(0, 2);
  });
  it("flags a drop across two percentile lines", () => {
    const r = crossingAlert("weight", "M", "2025-01-01", [
      { on: "2025-04-01", value: 6.4 },
      { on: "2025-10-01", value: 7.0 },
    ]);
    expect(r?.dropped).toBeGreaterThanOrEqual(2);
  });
  it("no alert on steady growth", () => {
    expect(crossingAlert("weight", "M", "2025-01-01", [
      { on: "2025-04-01", value: 6.4 },
      { on: "2025-07-01", value: 7.9 },
    ])).toBeNull();
  });
});
