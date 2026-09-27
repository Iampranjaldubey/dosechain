/**
 * Classifies a parent's WhatsApp reply (Hindi / Hinglish / English) using the
 * Lovable AI Gateway. Falls back to a keyword heuristic so the demo still works
 * when AI is unavailable (e.g. a fresh remix with no key).
 */
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export const Parsed = z.object({
  intent: z.enum(["confirm", "sick", "reschedule", "cancel", "question"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  summary: z.string().max(200),
});
export type ParsedReply = z.infer<typeof Parsed> & { via: "ai" | "rules" };

function heuristic(text: string): ParsedReply {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  if (has("fever", "bukhar", "बुखार", "sick", "bimar", "बीमार", "cough", "khansi", "खांसी", "ulti", "vomit"))
    return { intent: "sick", date: null, summary: "Child unwell", via: "rules" };
  if (has("cancel", "nahi aayenge", "नहीं आएंगे"))
    return { intent: "cancel", date: null, summary: "Wants to cancel", via: "rules" };
  if (has("later", "baad", "बाद", "change", "badal", "बदल", "next week", "agle", "अगले", "cannot come", "nahi aa"))
    return { intent: "reschedule", date: null, summary: "Wants another date", via: "rules" };
  if (has("yes", "ok", "haan", "हाँ", "हां", "ji", "जी", "confirm", "aayenge", "आएंगे", "👍"))
    return { intent: "confirm", date: null, summary: "Confirmed", via: "rules" };
  return { intent: "question", date: null, summary: "Needs a human reply", via: "rules" };
}

export async function parseReply(text: string, today: string, visitDay: string | null): Promise<ParsedReply> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return heuristic(text);
  try {
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: `You classify a parent's WhatsApp reply to a child clinic reminder. Replies may be Hindi, Hinglish or English.
Return ONLY a JSON object: {"intent": "confirm"|"sick"|"reschedule"|"cancel"|"question", "date": "YYYY-MM-DD" or null, "summary": short English summary}.
"sick" = child has fever/illness and cannot come. "reschedule" = wants another date (fill date if they name one; resolve relative days from today). Today is ${today}. The booked visit is ${visitDay ?? "unknown"}.`,
      prompt: text,
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
    const out = await result.text;
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return heuristic(text);
    const parsed = Parsed.safeParse(JSON.parse(m[0]));
    return parsed.success ? { ...parsed.data, via: "ai" } : heuristic(text);
  } catch (e) {
    console.error("parseReply failed", e);
    return heuristic(text);
  }
}
