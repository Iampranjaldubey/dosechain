/**
 * WHO Child Growth Standards (0–60 months), compact LMS reference at key ages,
 * linearly interpolated. Good for screening trends; not a diagnostic tool.
 */
type Row = [month: number, L: number, M: number, S: number];

const WFA_BOY: Row[] = [[0, 0.3487, 3.3464, 0.14602], [1, 0.2297, 4.4709, 0.13395], [2, 0.197, 5.5675, 0.12385], [3, 0.1738, 6.3762, 0.11727], [4, 0.1553, 7.0023, 0.11316], [6, 0.1257, 7.934, 0.10958], [9, 0.0917, 8.9014, 0.10881], [12, 0.0644, 9.6479, 0.10925], [18, 0.0199, 10.9385, 0.11059], [24, -0.0137, 12.1515, 0.11426], [36, -0.0689, 14.3429, 0.12158], [48, -0.1161, 16.3489, 0.12759], [60, -0.1521, 18.3366, 0.13194]];
const WFA_GIRL: Row[] = [[0, 0.3809, 3.2322, 0.14171], [1, 0.1714, 4.1873, 0.13724], [2, 0.0962, 5.1282, 0.13], [3, 0.0402, 5.8458, 0.12619], [4, -0.005, 6.4237, 0.12402], [6, -0.0756, 7.297, 0.12204], [9, -0.1447, 8.2254, 0.12115], [12, -0.2024, 8.9481, 0.12268], [18, -0.2929, 10.2315, 0.12632], [24, -0.3665, 11.4775, 0.13033], [36, -0.4788, 13.9, 0.1375], [48, -0.5684, 16.0697, 0.14258], [60, -0.6458, 18.2193, 0.14688]];
const HFA_BOY: Row[] = [[0, 1, 49.8842, 0.03795], [1, 1, 54.7244, 0.03557], [2, 1, 58.4249, 0.03424], [3, 1, 61.4292, 0.03328], [4, 1, 63.886, 0.03257], [6, 1, 67.6236, 0.03165], [9, 1, 72.0, 0.0318], [12, 1, 75.7488, 0.03137], [18, 1, 82.2587, 0.03229], [24, 1, 87.8161, 0.03507], [36, 1, 96.0835, 0.03811], [48, 1, 103.3, 0.0395], [60, 1, 110.0, 0.0406]];
const HFA_GIRL: Row[] = [[0, 1, 49.1477, 0.0379], [1, 1, 53.6872, 0.0364], [2, 1, 57.0673, 0.03568], [3, 1, 59.8029, 0.0352], [4, 1, 62.0899, 0.03486], [6, 1, 65.7311, 0.03448], [9, 1, 70.1435, 0.0347], [12, 1, 74.015, 0.03479], [18, 1, 80.7079, 0.03605], [24, 1, 86.4153, 0.03764], [36, 1, 95.0515, 0.04003], [48, 1, 102.7, 0.0415], [60, 1, 109.4, 0.0424]];

export type Measure = "weight" | "height";

function table(m: Measure, sex: string | null): Row[] {
  const girl = (sex ?? "").toLowerCase().startsWith("f");
  return m === "weight" ? (girl ? WFA_GIRL : WFA_BOY) : girl ? HFA_GIRL : HFA_BOY;
}

export function lms(m: Measure, sex: string | null, ageMonths: number): { L: number; M: number; S: number } {
  const t = table(m, sex);
  const a = Math.max(0, Math.min(60, ageMonths));
  let i = 0;
  while (i < t.length - 2 && t[i + 1]![0] < a) i++;
  const [m0, L0, M0, S0] = t[i]!;
  const [m1, L1, M1, S1] = t[i + 1]!;
  const f = m1 === m0 ? 0 : Math.max(0, Math.min(1, (a - m0) / (m1 - m0)));
  return { L: L0 + (L1 - L0) * f, M: M0 + (M1 - M0) * f, S: S0 + (S1 - S0) * f };
}

export function zScore(m: Measure, sex: string | null, ageMonths: number, value: number): number {
  const { L, M, S } = lms(m, sex, ageMonths);
  return Math.abs(L) < 1e-6 ? Math.log(value / M) / S : (Math.pow(value / M, L) - 1) / (L * S);
}

/** Value at a given z (used to draw percentile curves). */
export function valueAtZ(m: Measure, sex: string | null, ageMonths: number, z: number): number {
  const { L, M, S } = lms(m, sex, ageMonths);
  return Math.abs(L) < 1e-6 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

function erf(x: number): number {
  const s = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return s * y;
}

export function percentile(z: number): number {
  return Math.round(50 * (1 + erf(z / Math.SQRT2)) * 10) / 10;
}

export function ageMonths(dob: string, on: string): number {
  return (new Date(on + "T00:00:00Z").getTime() - new Date(dob + "T00:00:00Z").getTime()) / (30.4375 * 86400000);
}

/** Major percentile lines: 3, 15, 50, 85, 97. */
export const PERCENTILE_Z = { p3: -1.881, p15: -1.036, p50: 0, p85: 1.036, p97: 1.881 } as const;
const LINES = [-1.881, -1.036, 0, 1.036, 1.881];
function band(z: number): number {
  return LINES.filter((l) => z >= l).length;
}

/** Soft alert: latest reading crossed down 2+ major percentile lines vs an earlier one. */
export function crossingAlert(
  m: Measure,
  sex: string | null,
  dob: string,
  readings: { on: string; value: number }[],
): { dropped: number; from: number; to: number } | null {
  const pts = readings.filter((r) => r.value > 0).sort((a, b) => a.on.localeCompare(b.on));
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1]!;
  const zl = zScore(m, sex, ageMonths(dob, last.on), last.value);
  let worst: { dropped: number; from: number; to: number } | null = null;
  for (const p of pts.slice(0, -1)) {
    const zp = zScore(m, sex, ageMonths(dob, p.on), p.value);
    const d = band(zp) - band(zl);
    if (d >= 2 && (!worst || d > worst.dropped)) worst = { dropped: d, from: percentile(zp), to: percentile(zl) };
  }
  return worst;
}

export const MILESTONES = [
  { code: "social_smile", en: "Social smile", hi: "मुस्कुराना", month: 2 },
  { code: "head_control", en: "Holds head steady", hi: "सिर संभालना", month: 4 },
  { code: "rolls_over", en: "Rolls over", hi: "पलटना", month: 5 },
  { code: "sits", en: "Sits without support", hi: "बिना सहारे बैठना", month: 8 },
  { code: "crawls", en: "Crawls", hi: "घुटनों के बल चलना", month: 9 },
  { code: "stands", en: "Stands holding on", hi: "सहारे से खड़ा होना", month: 10 },
  { code: "first_words", en: "First words", hi: "पहले शब्द", month: 12 },
  { code: "walks", en: "Walks alone", hi: "अकेले चलना", month: 14 },
  { code: "two_words", en: "Two-word phrases", hi: "दो शब्द जोड़ना", month: 24 },
] as const;
