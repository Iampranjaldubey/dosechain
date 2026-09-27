import { ParentShell } from "@/components/ParentShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getFamily, payVisit } from "@/lib/media.functions";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Logo } from "@/components/Footprint";

export const Route = createFileRoute("/f/$token")({
  head: () => ({
    meta: [
      { title: "Your family's vaccines — DoseChain" },
      { name: "description", content: "All your children's next vaccine visits in one place, with one-tap UPI confirmation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Family,
});

const fmt = (d: string, hi: boolean) => new Date(d + "T00:00:00Z").toLocaleDateString(hi ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Family() {
  const { token } = Route.useParams();
  const { lang } = useLang();
  const hi = lang === "hi";
  const qc = useQueryClient();
  const [paying, setPaying] = useState<{ id: string; fee: number; name: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["family", token], queryFn: () => getFamily({ data: { token } }) });
  const pay = useMutation({
    mutationFn: (visitId: string) => payVisit({ data: { token, visitId } }),
    onSuccess: () => { setTimeout(() => setPaying(null), 1400); void qc.invalidateQueries(); },
  });

  const kids = data?.children ?? [];
  const days = kids.map((k) => k.next?.day).filter(Boolean) as string[];
  const together = days.length > 1 && Math.abs(Date.parse(days[0]!) - Date.parse(days[days.length - 1]!)) <= 21 * 864e5;

  return (
    <ParentShell eyebrow="Family">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
        {isLoading && <p className="py-16 text-center text-muted-foreground">…</p>}
        {!isLoading && !data && <p className="py-16 text-center text-muted-foreground">Link not found.</p>}
        {data && (
          <>
            <p className="text-sm text-muted-foreground">{data.guardian}</p>
            <h1 className="font-display text-4xl">{hi ? "आपका परिवार" : "Your family"}</h1>
            {together && (
              <div className="mt-5 rounded-2xl border border-accent bg-accent/15 p-4 text-sm">
                <b>{hi ? "एक ही बार में आएं!" : "Come together, save a trip!"}</b> {hi ? "बच्चों की विज़िट पास-पास हैं — एक ही दिन बुक करने के लिए क्लिनिक से कहें।" : "Your children's visits are close — reply in chat to book them on the same day."}
              </div>
            )}
            <div className="mt-6 space-y-4">
              {kids.map((k) => (
                <div key={k.token} className="rounded-3xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl">{k.name}</p>
                    <span className="text-xs text-muted-foreground">{k.due} {hi ? "टीके बाकी" : "doses to go"}</span>
                  </div>
                  {k.next ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/50 p-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">{hi ? "अगली विज़िट" : "Next visit"}</p>
                        <p className="font-semibold">{fmt(k.next.day, hi)} {k.next.slot ? `· ${k.next.slot}` : ""}</p>
                      </div>
                      {k.next.paid ? (
                        <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">✓ {hi ? "भुगतान · पक्का" : "Paid · confirmed"}</span>
                      ) : (
                        <button onClick={() => setPaying({ id: k.next!.id, fee: k.next!.fee || 950, name: k.name })} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                          {hi ? `₹${k.next.fee || 950} UPI से भरें` : `Pay ₹${k.next.fee || 950} via UPI`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">{hi ? "कोई विज़िट बुक नहीं" : "No visit booked"}</p>
                  )}
                  <div className="mt-3 flex gap-4 text-sm">
                    <Link to="/c/$token" params={{ token: k.token }} className="text-primary">{hi ? "पूरी योजना" : "Full plan"}</Link>
                    <Link to="/cert/$token" params={{ token: k.token }} className="text-primary">{hi ? "प्रमाणपत्र" : "Certificate"}</Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {paying && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 sm:place-items-center" role="dialog" aria-label="UPI payment">
          <div className="w-full max-w-sm rounded-t-3xl bg-card p-6 sm:rounded-3xl">
            {pay.isSuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-3xl text-primary-foreground">✓</div>
                <p className="mt-4 font-display text-2xl">₹{paying.fee} {hi ? "भुगतान सफल" : "paid"}</p>
                <p className="text-sm text-muted-foreground">{hi ? "विज़िट पक्की हो गई" : "Visit confirmed with the clinic"}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{hi ? "भुगतान करें" : "Pay to"} · nanhekadam@upi</p>
                <p className="mt-1 font-display text-4xl">₹{paying.fee}</p>
                <p className="text-sm text-muted-foreground">{paying.name} · {hi ? "टीका विज़िट" : "vaccine visit"}</p>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                  {["GPay", "PhonePe", "Paytm"].map((a) => (
                    <button key={a} onClick={() => pay.mutate(paying.id)} disabled={pay.isPending} className="rounded-xl border border-border py-3 hover:bg-secondary disabled:opacity-50">{a}</button>
                  ))}
                </div>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">{pay.isPending ? (hi ? "प्रोसेस हो रहा है…" : "Processing…") : hi ? "डेमो भुगतान — असली पैसे नहीं कटेंगे" : "Demo payment — no real money moves"}</p>
                <button onClick={() => setPaying(null)} className="mt-3 w-full text-sm text-muted-foreground">{hi ? "रद्द करें" : "Cancel"}</button>
              </>
            )}
          </div>
        </div>
      )}
    </ParentShell>
  );
}
