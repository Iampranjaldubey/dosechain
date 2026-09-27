import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Footprint";
import { whoAmI } from "@/lib/clinic.functions";

export const Route = createFileRoute("/clinic")({
  head: () => ({
    meta: [
      { title: "Clinic desk — DoseChain" },
      { name: "description", content: "Today's visits, rabies bite lane, reminders and doctor approvals for Nanhe Kadam Child Clinic." },
      { property: "og:title", content: "Clinic desk — DoseChain" },
      { property: "og:description", content: "The staff side of DoseChain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClinicLayout,
});

const NAV = [
  { to: "/clinic", label: "Today" },
  { to: "/clinic/approvals", label: "Approvals" },
  { to: "/clinic/messages", label: "Replies" },
  { to: "/clinic/capacity", label: "Capacity" },
] as const;

function ClinicLayout() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void nav({ to: "/auth" });
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) void nav({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const me = useQuery({ queryKey: ["me"], queryFn: () => whoAmI(), enabled: ready });

  if (!ready) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted" activeProps={{ className: "bg-secondary text-secondary-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {me.data?.roles.includes("doctor") ? "Doctor" : "Desk"}
          </span>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
