/** Simulated WhatsApp thread for parents. The token link is the auth. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Tok = z.object({ token: z.string().min(3).max(80) });

export const getThread = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => Tok.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
    const { resolveToken } = await import("./followup.server");
    const who = await resolveToken(a, data.token);
    if (!who) return null;
    const { data: msgs } = await a
      .from("messages")
      .select("id, direction, kind, body_en, body_hi, quick_replies, sent_at, created_at, visit_id")
      .eq("guardian_id", who.guardianId)
      .order("created_at", { ascending: true })
      .limit(80);
    return { name: who.name, kind: who.kind, lang: who.lang, messages: msgs ?? [] };
  });

export const sendReply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Tok.extend({ text: z.string().trim().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
    const { handleReply } = await import("./followup.server");
    const r = await handleReply(a, data.token, data.text);
    return { intent: r.parsed.intent, via: r.parsed.via };
  });
