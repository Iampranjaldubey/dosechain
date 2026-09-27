/**
 * Parent-side AI + trust features. Token links are the auth; every handler
 * validates the token before touching data and returns narrow projections.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Tok = z.string().min(3).max(80);
async function admin(): Promise<any> {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

// ---------- 1. paper card → doses ----------
export const readVaccineCard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ image: z.string().startsWith("data:image/").max(7_000_000), dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: cat } = await a.from("vaccine_doses").select("code, label_en, rec_age_d").order("sort");
    const codes = ((cat ?? []) as any[]).map((c) => `${c.code} = ${c.label_en} (~day ${c.rec_age_d})`).join("\n");
    try {
      const { aiText, extractJson } = await import("./ai.server");
      const text = await aiText(
        `You read photos of Indian child vaccination cards (IAP card, MCP card, hospital cards; handwritten or printed; English/Hindi).
Map every dose that is marked given to one of these codes:\n${codes}\nChild DOB: ${data.dob}.
Return ONLY JSON: {"doses":[{"code":"...","givenOn":"YYYY-MM-DD","confidence":"high"|"low"}],"notes":"one short sentence"}.
If a date is unreadable, estimate from the typical age and mark confidence "low". Skip doses not marked as given. Never invent codes.`,
        [{ role: "user", content: [{ type: "text", text: "Read this vaccination card." }, { type: "image", image: data.image }] }],
      );
      const parsed = extractJson<{ doses?: { code: string; givenOn: string; confidence?: string }[]; notes?: string }>(text);
      const valid = new Set(((cat ?? []) as any[]).map((c) => c.code));
      const doses = (parsed?.doses ?? []).filter((d) => valid.has(d.code) && /^\d{4}-\d{2}-\d{2}$/.test(d.givenOn));
      return { ok: true as const, doses, notes: parsed?.notes ?? "" };
    } catch (e) {
      console.error("readVaccineCard", e);
      return { ok: false as const, doses: [], notes: "Could not read the card right now — please tick the doses below." };
    }
  });

// ---------- 2. voice note ----------
export const sendVoiceNote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: Tok, audio: z.string().max(14_000_000), mime: z.string().max(60) }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { handleReply, resolveToken } = await import("./followup.server");
    if (!(await resolveToken(a, data.token))) throw new Error("Not found");
    let transcript = "";
    try {
      const { transcribe } = await import("./ai.server");
      transcript = await transcribe(Buffer.from(data.audio, "base64"), data.mime);
    } catch (e) {
      console.error("transcribe", e);
      return { ok: false as const, error: "Couldn't hear that clearly — please type your message." };
    }
    if (!transcript) return { ok: false as const, error: "No speech detected — please try again." };
    const r = await handleReply(a, data.token, `🎤 ${transcript}`);
    return { ok: true as const, transcript, intent: r.parsed.intent };
  });

// ---------- 3. read aloud ----------
export const speakMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: Tok, messageId: z.string().uuid(), lang: z.enum(["en", "hi"]) }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { resolveToken } = await import("./followup.server");
    const who = await resolveToken(a, data.token);
    if (!who) throw new Error("Not found");
    const { data: m } = await a.from("messages").select("body_en, body_hi, guardian_id").eq("id", data.messageId).single();
    if (!m || m.guardian_id !== who.guardianId) throw new Error("Not found");
    try {
      const { speakWav } = await import("./ai.server");
      const b64 = await speakWav(data.lang === "hi" ? m.body_hi ?? m.body_en : m.body_en);
      return { ok: true as const, src: `data:audio/wav;base64,${b64}` };
    } catch (e) {
      console.error("speak", e);
      return { ok: false as const, src: null };
    }
  });

// ---------- 4. certificate + public verify ----------
async function certData(token: string, full: boolean) {
  const a = await admin();
  const { data: child } = await a.from("children").select("id, name, dob, sex, public_token, clinic_id").eq("public_token", token).maybeSingle();
  if (!child) return null;
  const [{ data: doses }, { data: cat }, { data: s }] = await Promise.all([
    a.from("child_doses").select("code, status, given_on, where_given").eq("child_id", child.id).in("status", ["given", "given_elsewhere"]).order("given_on"),
    a.from("vaccine_doses").select("code, label_en, label_hi, sort"),
    a.from("clinic_settings").select("clinic_name, doctor_name, city, phone").eq("clinic_id", (child as any).clinic_id).maybeSingle(),
  ]);
  const byCode = new Map(((cat ?? []) as any[]).map((c) => [c.code, c]));
  return {
    child: full ? { name: child.name, dob: child.dob, sex: child.sex } : { name: String(child.name).split(" ")[0], dob: null, sex: null },
    doses: ((doses ?? []) as any[]).map((d) => ({ code: d.code, en: byCode.get(d.code)?.label_en ?? d.code, hi: byCode.get(d.code)?.label_hi ?? d.code, givenOn: d.given_on, where: d.where_given })),
    total: (cat ?? []).length,
    clinic: s,
    certNo: `NK-${String(child.id).slice(0, 8).toUpperCase()}`,
  };
}
export const getCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: Tok }).parse(d))
  .handler(async ({ data }) => certData(data.token, true));
export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: Tok }).parse(d))
  .handler(async ({ data }) => certData(data.token, false));

// ---------- 5. family view ----------
export const getFamily = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: Tok }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { resolveToken } = await import("./followup.server");
    const who = await resolveToken(a, data.token);
    if (!who) return null;
    const { data: g } = await a.from("guardians").select("name").eq("id", who.guardianId).single();
    const { data: kids } = await a.from("children").select("id, name, dob, public_token").eq("guardian_id", who.guardianId).order("dob");
    const out = [] as { name: string; dob: string; token: string; next: { id: string; day: string; slot: string | null; paid: boolean; fee: number; status: string } | null; due: number }[];
    for (const k of (kids ?? []) as any[]) {
      const [{ data: v }, { count }] = await Promise.all([
        a.from("visits").select("id, day, slot_label, paid_at, fee_inr, status").eq("child_id", k.id).in("status", ["booked", "confirmed"]).order("day").limit(1).maybeSingle(),
        a.from("child_doses").select("id", { count: "exact", head: true }).eq("child_id", k.id).in("status", ["planned", "booked"]),
      ]);
      out.push({ name: k.name, dob: k.dob, token: k.public_token, due: count ?? 0, next: v ? { id: v.id, day: v.day, slot: v.slot_label, paid: !!v.paid_at, fee: v.fee_inr ?? 0, status: v.status } : null });
    }
    return { guardian: g?.name ?? "", children: out };
  });

// ---------- 6. mock UPI pay & confirm ----------
export const payVisit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: Tok, visitId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { resolveToken } = await import("./followup.server");
    const who = await resolveToken(a, data.token);
    if (!who) throw new Error("Not found");
    const { data: v } = await a.from("visits").select("id, day, fee_inr, paid_at, child_id, children(guardian_id, name)").eq("id", data.visitId).single();
    if (!v || v.children?.guardian_id !== who.guardianId) throw new Error("Not found");
    if (v.paid_at) return { ok: true, already: true };
    const amount = v.fee_inr || 950;
    const ref = "UPI" + Date.now().toString().slice(-10);
    await a.from("payments").insert({ visit_id: v.id, amount_inr: amount, ref });
    await a.from("visits").update({ paid_at: new Date().toISOString(), status: "confirmed" }).eq("id", v.id);
    await a.from("messages").insert({
      guardian_id: who.guardianId, direction: "out", kind: "payment", status: "sent", sent_at: new Date().toISOString(), visit_id: v.id,
      body_en: `✅ Payment of ₹${amount} received (ref ${ref}). ${v.children.name}'s visit is confirmed — no queue at the desk.`,
      body_hi: `✅ ₹${amount} का भुगतान मिला (रेफ ${ref})। ${v.children.name} की विज़िट पक्की — काउंटर पर लाइन नहीं।`,
    });
    await a.from("impact_events").insert({ kind: "auto_confirm", minutes_saved: 3 });
    return { ok: true, already: false, amount, ref };
  });
