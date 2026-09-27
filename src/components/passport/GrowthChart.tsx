import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ageMonths, percentile, PERCENTILE_Z, valueAtZ, zScore, type Measure } from "@/lib/growth";

export function GrowthChart({ measure, sex, dob, points }: { measure: Measure; sex: string | null; dob: string; points: { on: string; value: number }[] }) {
  const lastAge = points.length ? ageMonths(dob, points[points.length - 1]!.on) : 12;
  const maxM = Math.min(60, Math.max(12, Math.ceil((lastAge + 3) / 6) * 6));
  const rows: Record<string, number | null>[] = [];
  for (let m = 0; m <= maxM; m += maxM > 24 ? 2 : 1) {
    const r: Record<string, number | null> = { m };
    for (const [k, z] of Object.entries(PERCENTILE_Z)) r[k] = Math.round(valueAtZ(measure, sex, m, z) * 10) / 10;
    rows.push(r);
  }
  const child = points.map((p) => ({ m: Math.round(ageMonths(dob, p.on) * 10) / 10, child: p.value }));
  const data = [...rows, ...child].sort((a, b) => (a.m as number) - (b.m as number));
  const unit = measure === "weight" ? "kg" : "cm";
  const last = points[points.length - 1];
  const pct = last ? percentile(zScore(measure, sex, ageMonths(dob, last.on), last.value)) : null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h4 className="font-semibold">{measure === "weight" ? "Weight" : "Height / length"}</h4>
        {pct !== null && <span className="text-sm text-muted-foreground">Latest: {last!.value} {unit} · {pct}th percentile</span>}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 16, left: -12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="m" type="number" domain={[0, maxM]} tick={{ fontSize: 11 }} label={{ value: "Age (months)", position: "insideBottom", offset: -8, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
            <Tooltip formatter={(v: number, n: string) => [`${v} ${unit}`, n === "child" ? "Child" : n.replace("p", "") + "th pct"]} labelFormatter={(m) => `${m} months`} />
            {(["p3", "p97"] as const).map((k) => <Line key={k} dataKey={k} stroke="var(--muted-foreground)" strokeOpacity={0.35} dot={false} connectNulls isAnimationActive={false} />)}
            {(["p15", "p85"] as const).map((k) => <Line key={k} dataKey={k} stroke="var(--secondary)" dot={false} connectNulls isAnimationActive={false} />)}
            <Line dataKey="p50" stroke="var(--primary)" strokeOpacity={0.5} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="child" stroke="var(--accent-foreground)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--primary)" }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">Lines: 3rd, 15th, 50th, 85th, 97th percentile (WHO Child Growth Standards).</p>
    </div>
  );
}
