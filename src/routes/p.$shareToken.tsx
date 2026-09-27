import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logo } from "@/components/Footprint";
import { supabase } from "@/integrations/supabase/client";
import { Card, DocList, GrowthSection, MilestoneList, SummaryCard, VaccineTable, VisitsList } from "@/components/passport/PassportView";
import { claimSharedChild, getSharedPassport } from "@/lib/health.functions";
import { whoAmI } from "@/lib/clinic.functions";

export const Route = createFileRoute("/p/$shareToken")({
  head: () => ({
    meta: [
      { title: "Shared health record — DoseChain" },
      { name: "description", content: "A parent has shared their child's health passport with you. Read-only, time-limited." },
      { property: "og:title", content: "Shared health record — DoseChain" },
      { property: "og:description", content: "A read-only, time-limited child health passport." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedPage,
});

function SharedPage() {
  const { shareToken } = Route.useParams();
  const q = useQuery({ queryKey: ["shared", shareToken], queryFn: () => getSharedPassport({ data: { shareToken } }), staleTime: Infinity });
  const [clinics, setClinics] = useState<{ clinicId: string; clinicName: string }[]>([]);
  const [claimed, setClaimed] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) whoAmI().then((r) => setClinics(r.memberships)).catch(() => {});
    });
  }, []);

  const claim = async (clinicId: string) => {
    try {
      const r = await claimSharedChild({ data: { shareToken, clinicId } });
      setClaimed(r.childToken);
      toast.success("Child added to your clinic");
    } catch (e) { toast.error((e as Error).message); }
  };

  const d = q.data;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/"><Logo /></Link>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Read-only · shared by parent</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {q.isLoading && <p className="py-20 text-center text-muted-foreground">Loading…</p>}
        {d && d.state !== "ok" && (
          <div className="rounded-3xl border border-border bg-card p-10 text-center">
            <h1 className="font-display text-2xl">{d.state === "expired" ? "This link has expired" : d.state === "revoked" ? "The parent turned this link off" : "Link not found"}</h1>
            <p className="mt-2 text-muted-foreground">Ask the parent to create a new QR code from their Health Passport.</p>
          </div>
        )}
        {d?.state === "ok" && d.passport && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground print:hidden">
              <span>Access ends {new Date(d.expiresAt!).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</span>
              <button onClick={() => window.print()} className="rounded-xl border border-border bg-card px-3 py-1.5 font-semibold text-foreground">Print / save PDF</button>
            </div>
            {clinics.length > 0 && (
              <div className="rounded-3xl border-2 border-primary/40 bg-primary/5 p-5 print:hidden">
                {claimed ? (
                  <p className="font-semibold">Added. <Link to="/h/$token" params={{ token: claimed }} className="text-primary underline">Open in your clinic →</Link></p>
                ) : (
                  <>
                    <p className="font-semibold">You're signed in as clinic staff</p>
                    <p className="text-sm text-muted-foreground">Copy this child and full history into your clinic, so you can continue care and send reminders.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {clinics.map((c) => <button key={c.clinicId} onClick={() => void claim(c.clinicId)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add to {c.clinicName}</button>)}
                    </div>
                  </>
                )}
              </div>
            )}
            <SummaryCard p={d.passport} />
            {d.passport.profile.notes && <Card title="Notes"><p>{d.passport.profile.notes}</p></Card>}
            <Card title="Visits & prescriptions"><VisitsList p={d.passport} /></Card>
            <Card title="Growth"><GrowthSection p={d.passport} /></Card>
            <Card title="Vaccination record"><VaccineTable p={d.passport} /></Card>
            <Card title="Milestones"><MilestoneList p={d.passport} /></Card>
            <Card title="Reports"><DocList p={d.passport} /></Card>
          </>
        )}
      </main>
    </div>
  );
}
