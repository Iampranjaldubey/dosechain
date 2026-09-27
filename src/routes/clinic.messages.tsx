import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listThreads, sendDraftReply } from "@/lib/clinic.functions";

export const Route = createFileRoute("/clinic/messages")({ component: Replies });

/* eslint-disable @typescript-eslint/no-explicit-any */
const LABEL: Record<string, string> = { confirm: "Confirmed", sick: "Child unwell", reschedule: "Reschedule", cancel: "Cancel", question: "Needs reply" };

function Replies() {
  const { data = [], isLoading } = useQuery({ queryKey: ["threads"], queryFn: () => listThreads(), refetchInterval: 8000 });
  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="font-display text-4xl">Parent replies</h1>
      <p className="mt-1 text-muted-foreground">Every WhatsApp reply, read and sorted by AI (Hindi, Hinglish or English).</p>
      {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      <ul className="mt-6 divide-y divide-border rounded-3xl border border-border bg-card">
        {(data as any[]).map((m) => {
          const g = m.guardians ?? {};
          const who = g.children?.[0] ?? g.bite_cases?.[0];
          const token = who?.public_token;
          const intent = m.parsed?.intent as string | undefined;
          return (
            <li key={m.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{g.name ?? "Parent"} {who && <span className="font-normal text-muted-foreground">· {who.name ?? who.patient_name}</span>}</p>
                <p className="mt-0.5 text-sm">"{m.body_en}"</p>
                {m.draft_reply && m.status !== "answered" && <DraftBox m={m} />}
                {m.status === "answered" && <p className="mt-1 text-xs text-primary">✓ Doctor replied</p>}
              </div>
              {intent && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{LABEL[intent] ?? intent}{m.parsed?.via === "ai" ? " · AI" : ""}</span>}
              {token && <a href={`/wa/${token}`} target="_blank" rel="noreferrer" className="text-xs text-primary">Open chat</a>}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function DraftBox({ m }: { m: any }) {
  const qc = useQueryClient();
  const [en, setEn] = useState<string>(m.draft_reply.en);
  const send = useMutation({
    mutationFn: () => sendDraftReply({ data: { messageId: m.id, en, hi: en === m.draft_reply.en ? m.draft_reply.hi : en } }),
    onSuccess: () => { toast.success("Reply sent on WhatsApp"); void qc.invalidateQueries({ queryKey: ["threads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-3 rounded-2xl border border-accent/60 bg-accent/10 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">AI-drafted reply · IAP/WHO guidance · you approve</p>
      <textarea value={en} onChange={(e) => setEn(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border bg-card p-2 text-sm" />
      <p className="text-xs text-muted-foreground">हिंदी: {m.draft_reply.hi}</p>
      <button onClick={() => send.mutate()} disabled={send.isPending || !en.trim()} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{send.isPending ? "Sending…" : "Approve & send"}</button>
    </div>
  );
}
