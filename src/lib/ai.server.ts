/** Shared Lovable AI Gateway helpers (server-only). All callers must handle a thrown error with a non-AI fallback. */
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const BASE = "https://ai.gateway.lovable.dev";

function key(): string {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("AI not configured");
  return k;
}

/** Streamed Responses call, returns final text. */
export async function aiText(system: string, input: string | ModelMessage[]): Promise<string> {
  const apiKey = key();
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: `${BASE}/v1`,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system,
    ...(typeof input === "string" ? { prompt: input } : { messages: input }),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.text;
}

export function extractJson<T = unknown>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

/** Speech-to-text (streamed SSE, accumulated). */
export async function transcribe(bytes: Uint8Array, mime: string): Promise<string> {
  const apiKey = key();
  const form = new FormData();
  form.append("model", "google/gemini-3.5-transcribe");
  form.append("file", new File([bytes], "note.webm", { type: mime.startsWith("audio/") ? mime.split(";")[0]! : "audio/webm" }));
  form.append("response_format", "json");
  form.append("stream", "true");
  const res = await fetch(`${BASE}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
    body: form,
  });
  if (!res.ok || !res.body) throw new Error(`Transcription failed (${res.status})`);
  const raw = await res.text();
  let deltas = "";
  let done = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const ev = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
      if (ev.type === "transcript.text.delta" && ev.delta) deltas += ev.delta;
      if (ev.type === "transcript.text.done" && ev.text) done = ev.text;
    } catch {
      /* partial */
    }
  }
  return (done || deltas).trim();
}

/** Text-to-speech → complete WAV bytes (base64). */
export async function speakWav(text: string): Promise<string> {
  const apiKey = key();
  const res = await fetch(`${BASE}/v1/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say warmly and slowly, like a kind clinic nurse: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Speech failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return Buffer.from(buf).toString("base64");
}
