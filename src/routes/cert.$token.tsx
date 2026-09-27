import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { getCertificate } from "@/lib/media.functions";
import { Logo } from "@/components/Footprint";

export const Route = createFileRoute("/cert/$token")({
  head: () => ({
    meta: [
      { title: "Vaccination certificate — DoseChain" },
      { name: "description", content: "Printable, QR-verifiable vaccination certificate from Nanhe Kadam Child Clinic." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cert,
});

const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

function Cert() {
  const { token } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["cert", token], queryFn: () => getCertificate({ data: { token } }) });
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  if (isLoading) return <p className="p-16 text-center text-muted-foreground">Preparing certificate…</p>;
  if (!data) return <p className="p-16 text-center text-muted-foreground">This link doesn't match any record.</p>;
  const verifyUrl = `${origin}/verify/${token}`;

  return (
    <div className="min-h-screen bg-muted/40 py-8 print:bg-background print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between px-4 print:hidden">
        <Link to="/c/$token" params={{ token }} className="text-sm text-primary">← Back to plan</Link>
        <button onClick={() => window.print()} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Print / Save PDF</button>
      </div>
      <article className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border-2 border-primary/40 bg-card p-10 shadow-xl print:rounded-none print:border-0 print:shadow-none">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-secondary" />
        <header className="relative flex items-start justify-between gap-6">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">{data.clinic?.clinic_name} · {data.clinic?.city}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Certificate no.</p>
            <p className="font-mono text-sm font-semibold">{data.certNo}</p>
          </div>
        </header>
        <h1 className="relative mt-8 font-display text-4xl">Vaccination Certificate</h1>
        <p className="font-display text-xl text-primary">टीकाकरण प्रमाणपत्र</p>
        <dl className="mt-6 grid grid-cols-3 gap-4 rounded-2xl bg-secondary/50 p-5 text-sm">
          <div><dt className="text-muted-foreground">Child</dt><dd className="font-semibold">{data.child.name}</dd></div>
          <div><dt className="text-muted-foreground">Date of birth</dt><dd className="font-semibold">{fmt(data.child.dob)}</dd></div>
          <div><dt className="text-muted-foreground">Doses completed</dt><dd className="font-semibold">{data.doses.length} of {data.total}</dd></div>
        </dl>
        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Vaccine</th><th>टीका</th><th>Date given</th><th>Where</th></tr></thead>
          <tbody>
            {data.doses.map((d) => (
              <tr key={d.code} className="border-b border-border/60"><td className="py-1.5 font-medium">{d.en}</td><td>{d.hi}</td><td className="tabular-nums">{fmt(d.givenOn)}</td><td className="text-muted-foreground">{d.where === "govt" ? "Govt centre" : "This clinic"}</td></tr>
            ))}
          </tbody>
        </table>
        <footer className="mt-8 flex items-end justify-between gap-6">
          <div>
            <p className="font-display text-2xl italic text-primary">{data.clinic?.doctor_name}</p>
            <p className="border-t border-border pt-1 text-xs text-muted-foreground">Paediatrician · digitally issued via DoseChain · schedule per IAP-ACVIP</p>
          </div>
          <div className="text-center">
            {origin && <QRCodeSVG value={verifyUrl} size={104} />}
            <p className="mt-1 text-[11px] text-muted-foreground">Scan to verify</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
