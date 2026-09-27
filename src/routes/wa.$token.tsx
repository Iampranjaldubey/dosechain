import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getThread, sendReply } from "@/lib/wa.functions";
import { sendVoiceNote, speakMessage } from "@/lib/media.functions";
import { Link } from "@tanstack/react-router";
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

  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [voiceErr, setVoiceErr] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCache = useRef(new Map<string, string>());
  const voice = useMutation({
    mutationFn: (v: { audio: string; mime: string }) => sendVoiceNote({ data: { token, ...v } }),
    onSuccess: (r) => { if (!r.ok) setVoiceErr(r.error); void qc.invalidateQueries({ queryKey: ["wa", token] }); },
    onError: () => setVoiceErr(lang === "hi" ? "आवाज़ नहीं भेज सके — लिखकर भेजें।" : "Couldn't send the voice note — please type instead."),
  });
  async function toggleRec() {
    setVoiceErr("");
    if (rec) { rec.stop(); setRec(null); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size < 1000) { setVoiceErr(lang === "hi" ? "बहुत छोटा संदेश" : "Too short — hold and speak"); return; }
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
        voice.mutate({ audio: btoa(bin), mime: "audio/webm" });
      };
      mr.start(); setRec(mr);
    } catch { setVoiceErr(lang === "hi" ? "माइक की अनुमति नहीं मिली" : "Microphone permission denied"); }
  }
  async function play(id: string) {
    setPlaying(id);
    try {
      let src = audioCache.current.get(id + lang);
      if (!src) {
        const r = await speakMessage({ data: { token, messageId: id, lang: lang === "hi" ? "hi" : "en" } });
        if (!r.ok || !r.src) throw new Error();
        src = r.src; audioCache.current.set(id + lang, src);
      }
      const au = new Audio(src); au.onended = () => setPlaying(null); await au.play();
    } catch { setPlaying(null); setVoiceErr(lang === "hi" ? "अभी सुनाई नहीं दे सकता" : "Audio unavailable right now"); }
  }

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
                {m.direction === "out" && (
                  <button onClick={() => play(m.id)} disabled={playing !== null} aria-label="Listen" className="mb-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground disabled:opacity-60">
                    {playing === m.id ? "🔊 …" : `▶ ${lang === "hi" ? "सुनें" : "Listen"}`}
                  </button>
                )}
                <p className="whitespace-pre-wrap">{m.direction === "in" ? m.body_en : lang === "hi" ? m.body_hi ?? m.body_en : m.body_en}</p>
                <p className="mt-0.5 text-right text-[11px] opacity-60">{new Date(m.sent_at ?? m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}{m.direction === "in" ? " ✓✓" : ""}</p>
                {m.direction === "out" && m.kind === "reminder_1d" && data?.kind === "child" && (
                  <Link to="/f/$token" params={{ token }} className="mt-1.5 block rounded-xl bg-primary/10 px-3 py-1.5 text-center text-sm font-semibold text-primary">💳 {lang === "hi" ? "UPI से भरें और पक्का करें" : "Pay via UPI & confirm"}</Link>
                )}
              </div>
            </div>
          ))}
          {voice.isPending && <p className="text-center text-xs text-muted-foreground">{lang === "hi" ? "🎤 आवाज़ समझ रहे हैं…" : "🎤 Listening to your voice note…"}</p>}
          {voiceErr && <p role="alert" className="text-center text-xs text-destructive">{voiceErr}</p>}
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
          <input maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={lang === "hi" ? "संदेश लिखें… (जैसे: बच्चे को बुखार है)" : "Type a message… (e.g. baby has fever)"} className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2.5" aria-label="Message" />
          <button type="button" onClick={toggleRec} disabled={voice.isPending} aria-label={rec ? "Stop recording" : "Record voice note"} className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg", rec ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground")}>
            {rec ? "■" : "🎤"}
          </button>
          <button disabled={!text.trim() || send.isPending} aria-label={lang === "hi" ? "भेजें" : "Send"} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-4">
            <span className="sm:hidden">➤</span><span className="hidden font-semibold sm:inline">{lang === "hi" ? "भेजें" : "Send"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
