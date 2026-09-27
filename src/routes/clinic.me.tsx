import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyOverview } from "@/lib/clinic.functions";
import { fmtSlot } from "@/lib/i18n";

export const Route = createFileRoute("/clinic/me")({
  head: () => ({
    meta: [
      { title: "My clinics — DoseChain staff" },
      { name: "description", content: "Your assigned clinics, their children, upcoming visits and weekly capacity." },
      { property: "og:title", content: "My clinics — DoseChain staff" },
      { property: "og:description", content: "A staff-only overview of your assigned clinics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyClinics,
});

const day = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const ageOf = (dob: string) => {
  const m = Math.floor((Date.now() - new Date(dob + "T00:00:00").getTime()) / (30.44 * 864e5));
  return m < 24 ? `${m} mo` : `${Math.floor(m / 12)} yr`;
};

function MyClinics() {
  const q = useQuery({ queryKey: ["my-overview"], queryFn: () => getMyOverview() });
  if (q.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (q.isError) return <p className="text-destructive">Couldn't load your clinics. <button className="underline" onClick={() => q.refetch()}>Try again</button></p>;
  const clinics = q.data ?? [];
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl">My clinics</h1>
        <p className="text-muted-foreground">Only the clinics you're assigned to, and only their children and visits.</p>
      </header>
      {clinics.map((c) => (
        <section key={c.clinicId} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">{c.clinicName}{c.city ? <span className="text-base text-muted-foreground"> · {c.city}</span> : null}</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">{c.role === "doctor" ? "Doctor" : "Desk staff"}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Children" value={c.children.length} />
            <Stat label="Visits in next 7 days" value={c.visitsNext7} />
            <Stat label="Open hours / week" value={c.weeklyOpenHours} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold">Upcoming visits</h3>
              <ul className="mt-2 divide-y divide-border">
                {c.upcoming.length === 0 && <li className="py-2 text-sm text-muted-foreground">No upcoming visits.</li>}
                {c.upcoming.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {v.token ? <Link to="/h/$token" params={{ token: v.token }} className="font-medium hover:underline">{v.child}</Link> : <span className="font-medium">{v.kind === "bite" ? "Dog-bite dose" : "Visit"}</span>}
                      <span className="text-muted-foreground"> · {day(v.day)}{v.slot ? `, ${fmtSlot(v.slot)}` : ""}</span>
                    </span>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">{v.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Children</h3>
              <ul className="mt-2 max-h-80 divide-y divide-border overflow-auto">
                {c.children.length === 0 && <li className="py-2 text-sm text-muted-foreground">No children registered yet.</li>}
                {c.children.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link to="/h/$token" params={{ token: k.token }} className="truncate font-medium hover:underline">{k.name}</Link>
                    <span className="text-xs text-muted-foreground">{ageOf(k.dob)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm"><Link to="/clinic/capacity" className="underline">Open capacity planner</Link></p>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <p className="font-display text-3xl">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
