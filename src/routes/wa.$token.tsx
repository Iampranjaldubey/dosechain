import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getThread, sendReply } from "@/lib/wa.functions";
import { useLang } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wa/$token")({
  head: () => ({
    meta: [
      { title: "Clinic chat — DoseChain" },
      { name: "description", content: "WhatsApp-style reminders and replies from Nanhe Kadam Child Clinic." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Chat,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
function Chat() {
  const { token } = Route.useParams();
  const { lang } = useLang();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({ queryKey: ["wa", token], queryFn: () => getThread({ data: { token } }), refetchInterval: 4000 });
  const send = useMutation({
    mutationFn: (t: string) => sendReply({ data: { token, text: t } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa", token] }),
  });
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [data?.messages.length, send.isPending]);

  const submit = (t: string) => {
    if (!t.trim() || send.isPending) return;
    setText("");
    send.mutate(t.trim());
  };
  const msgs = (data?.messages ?? []) as any[];
  const last = msgs[msgs.length - 1];
  const quick: string[] = last?.direction === "out" && Array.isArray(last.quick_replies) ? last.quick_replies : [];

  return (
    <div className="flex min-h-screen justify-center bg-muted/50">
      <div className="flex h-screen w-full max-w-md flex-col bg-background shadow-xl">
        <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/20 font-display text-lg">NK</div>
          <div className="flex-1">
            <p className="font-semibold leading-tight">Nanhe Kadam Clinic</p>
            <p className="text-xs opacity-80">{data ? `${lang === "hi" ? "के लिए" : "about"} ${data.name}` : "…"}</p>
          </div>
          <LangToggle />
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto bg-secondary/30 px-3 py-4">
          {isLoading && <p className="text-center text-sm text-muted-foreground">…</p>}
          {!isLoading && !data && <p className="text-center text-sm text-muted-foreground">Link not found.</p>}
          {msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.direction === "in" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2 text-[15px] shadow-sm", m.direction === "in" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card text-card-foreground")}>
                <p className="whitespace-pre-wrap">{m.direction === "in" ? m.body_en : lang === "hi" ? m.body_hi ?? m.body_en : m.body_en}</p>
                <p className="mt-0.5 text-right text-[11px] opacity-60">{new Date(m.sent_at ?? m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</p>
              </div>
            </div>
          ))}
          {send.isPending && <p className="text-center text-xs text-muted-foreground">{lang === "hi" ? "क्लिनिक पढ़ रहा है…" : "Clinic is reading…"}</p>}
          <div ref={end} />
        </div>
        {quick.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border bg-card px-3 py-2">
            {quick.map((q) => (
              <button key={q} onClick={() => submit(q)} className="rounded-full border border-primary px-3 py-1.5 text-sm text-primary">{q}</button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); submit(text); }} className="flex gap-2 border-t border-border bg-card p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={lang === "hi" ? "संदेश लिखें… (जैसे: बच्चे को बुखार है)" : "Type a message… (e.g. baby has fever)"} className="flex-1 rounded-full border border-input bg-background px-4 py-2.5" aria-label="Message" />
          <button disabled={!text.trim() || send.isPending} className="rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{lang === "hi" ? "भेजें" : "Send"}</button>
        </form>
      </div>
    </div>
  );
}
