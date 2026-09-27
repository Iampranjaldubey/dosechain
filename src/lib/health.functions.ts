/**
 * Child Health Passport server functions.
 * Parents: the child's secret link token is the credential (validated first, then admin client).
 * Doctors with a share link: read-only, expiring, logged.
 * Clinic staff: requireSupabaseAuth + is_staff_of check; writes go through RLS as the user.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
}
async function core() {
  return import("./health.server");
}
function randToken(n = 24) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
}

const Tok = z.string().min(3).max(80);
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Txt = (n: number) => z.string().trim().max(n).optional().nullable();
const Rx = z.object({ medicine: z.string().trim().min(1).max(120), dose: Txt(60), frequency: Txt(60), days: z.number().int().min(0).max(90).optional().nullable(), remind: z.boolean().optional() });
const VisitIn = z.object({
  visitDate: Day, doctorName: Txt(120), clinicName: Txt(120), symptoms: Txt(1000), diagnosis: Txt(500), advice: Txt(1000),
  followUpOn: Day.optional().nullable(), isIllness: z.boolean().optional(), rx: z.array(Rx).max(12).default([]),
  weightKg: z.number().min(0.5).max(60).optional().nullable(), heightCm: z.number().min(30).max(150).optional().nullable(), headCm: z.number().min(25).max(60).optional().nullable(),
});

// ---------- parent (child token) ----------

export const getPassport = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: Tok }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken, loadPassport } = await core();
    const child = await childByToken(a, data.token);
    if (!child) return null;
    return loadPassport(a, child, { includeShares: true });
  });

export const saveHealthProfile = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: Tok, bloodGroup: Txt(5), allergies: z.array(z.string().trim().min(1).max(60)).max(20), conditions: z.array(z.string().trim().min(1).max(80)).max(20),
      birthWeightKg: z.number().min(0.3).max(7).optional().nullable(), notes: Txt(1000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    const child = await childByToken(a, data.token);
    if (!child) throw new Error("Not found");
    const { error } = await a.from("health_profile").upsert({
      child_id: child.id, clinic_id: child.clinic_id, blood_group: data.bloodGroup || null, allergies: data.allergies, conditions: data.conditions,
      birth_weight_kg: data.birthWeightKg ?? null, notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function insertVisit(a: any, child: { id: string; clinic_id: string }, v: z.infer<typeof VisitIn>, source: "clinic" | "parent") {
  const { data: hv, error } = await a.from("health_visits").insert({
    child_id: child.id, clinic_id: child.clinic_id, visit_date: v.visitDate, doctor_name: v.doctorName || null, clinic_name: v.clinicName || null,
    symptoms: v.symptoms || null, diagnosis: v.diagnosis || null, advice: v.advice || null, follow_up_on: v.followUpOn || null, is_illness: !!v.isIllness, source,
  }).select("id").single();
  if (error || !hv) throw new Error(error?.message ?? "Could not save visit");
  if (v.rx.length)
    await a.from("prescriptions").insert(v.rx.map((r) => ({ health_visit_id: hv.id, clinic_id: child.clinic_id, medicine: r.medicine, dose: r.dose || null, frequency: r.frequency || null, days: r.days ?? null, remind: !!r.remind })));
  if (v.weightKg || v.heightCm || v.headCm)
    await a.from("growth_readings").insert({ child_id: child.id, clinic_id: child.clinic_id, measured_on: v.visitDate, weight_kg: v.weightKg ?? null, height_cm: v.heightCm ?? null, head_cm: v.headCm ?? null, source });
  return hv.id as string;
}

export const addParentVisit = createServerFn({ method: "POST" })
  .inputValidator((d) => VisitIn.extend({ token: Tok }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    const child = await childByToken(a, data.token);
    if (!child) throw new Error("Not found");
    await insertVisit(a, child, data, "parent");
    return { ok: true };
  });

export const addGrowthReading = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: Tok, on: Day, weightKg: z.number().min(0.5).max(60).nullable(), heightCm: z.number().min(30).max(150).nullable(), headCm: z.number().min(25).max(60).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    const child = await childByToken(a, data.token);
    if (!child) throw new Error("Not found");
    if (!data.weightKg && !data.heightCm && !data.headCm) throw new Error("Enter at least one measurement");
    await a.from("growth_readings").insert({ child_id: child.id, clinic_id: child.clinic_id, measured_on: data.on, weight_kg: data.weightKg, height_cm: data.heightCm, head_cm: data.headCm, source: "parent" });
    return { ok: true };
  });

export const setMilestone = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: Tok, code: z.string().max(40), achievedOn: Day.nullable() }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    const child = await childByToken(a, data.token);
    if (!child) throw new Error("Not found");
    if (data.achievedOn) await a.from("milestones").upsert({ child_id: child.id, clinic_id: child.clinic_id, code: data.code, achieved_on: data.achievedOn });
    else await a.from("milestones").delete().eq("child_id", child.id).eq("code", data.code);
    return { ok: true };
  });

export const uploadHealthDoc = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: Tok, kind: z.enum(["lab", "discharge", "vaccine_card", "prescription", "scan", "other"]), title: Txt(120), docDate: Day.optional().nullable(),
      mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]), base64: z.string().max(14_000_000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    const child = await childByToken(a, data.token);
    if (!child) throw new Error("Not found");
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.length > 10 * 1024 * 1024) throw new Error("File is larger than 10 MB");
    const ext = data.mime === "application/pdf" ? "pdf" : data.mime.split("/")[1];
    const path = `${child.id}/${Date.now()}-${randToken(6)}.${ext}`;
    const up = await a.storage.from("health-docs").upload(path, bytes, { contentType: data.mime });
    if (up.error) throw new Error(up.error.message);
    await a.from("health_documents").insert({ child_id: child.id, clinic_id: child.clinic_id, kind: data.kind, title: data.title || null, doc_date: data.docDate || null, file_path: path, source: "parent" });
    return { ok: true };
  });

export const readReportPhoto = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: Tok, dataUrl: z.string().max(14_000_000) }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    if (!(await childByToken(a, data.token))) throw new Error("Not found");
    try {
      const { aiText, extractJson } = await import("./ai.server");
      const out = await aiText("You read photos of Indian child medical documents. Return ONLY JSON {\"kind\":\"lab|discharge|vaccine_card|prescription|scan|other\",\"title\":\"short title under 60 chars\",\"date\":\"YYYY-MM-DD or null\"}.", [
        { role: "user", content: [{ type: "text", text: "What document is this?" }, { type: "image", image: data.dataUrl }] },
      ] as any);
      return extractJson<{ kind?: string; title?: string; date?: string | null }>(out) ?? {};
    } catch {
      return {};
    }
  });

export const createShareLink = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: Tok, hours: z.union([z.literal(1), z.literal(24), z.literal(168)]) }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    const child = await childByToken(a, data.token);
    if (!child) throw new Error("Not found");
    const token = randToken(24);
    const expires = new Date(Date.now() + data.hours * 3600_000).toISOString();
    await a.from("share_links").insert({ child_id: child.id, clinic_id: child.clinic_id, token, expires_at: expires });
    return { shareToken: token, expiresAt: expires };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: Tok, linkId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { childByToken } = await core();
    const child = await childByToken(a, data.token);
    if (!child) throw new Error("Not found");
    await a.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", data.linkId).eq("child_id", child.id);
    return { ok: true };
  });

// ---------- doctor with a share link (public, read-only) ----------

async function validShare(a: any, shareToken: string) {
  const { data: link } = await a.from("share_links").select("id, child_id, clinic_id, expires_at, revoked_at").eq("token", shareToken).maybeSingle();
  if (!link) return { state: "missing" as const };
  if (link.revoked_at) return { state: "revoked" as const };
  if (new Date(link.expires_at).getTime() < Date.now()) return { state: "expired" as const };
  return { state: "ok" as const, link };
}

export const getSharedPassport = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ shareToken: z.string().min(10).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const v = await validShare(a, data.shareToken);
    if (v.state !== "ok") return { state: v.state, passport: null, expiresAt: null };
    const { data: child } = await a.from("children").select("id, name, dob, sex, clinic_id").eq("id", v.link.child_id).single();
    await a.from("share_views").insert({ link_id: v.link.id, clinic_id: v.link.clinic_id, viewer: "Opened link" });
    const { loadPassport } = await core();
    return { state: "ok" as const, passport: await loadPassport(a, child, { includeShares: false }), expiresAt: v.link.expires_at as string };
  });

// ---------- clinic staff ----------

async function staffChild(context: any, childToken: string) {
  const a = await admin();
  const { childByToken } = await core();
  const child = await childByToken(a, childToken);
  if (!child) throw new Error("Child not found");
  const { data: ok } = await context.supabase.rpc("is_staff_of", { _clinic: child.clinic_id });
  if (!ok) throw new Error("Only this child's clinic staff can do this");
  return { a, child };
}

export const amIStaffFor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: Tok }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      await staffChild(context, data.token);
      return { staff: true };
    } catch {
      return { staff: false };
    }
  });

function fmtD(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

export const staffRecordVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VisitIn.extend({ token: Tok }).parse(d))
  .handler(async ({ data, context }) => {
    const { a, child } = await staffChild(context, data.token);
    const sb = context.supabase as any;
    const { data: s } = await a.from("clinic_settings").select("clinic_name, doctor_name").eq("clinic_id", child.clinic_id).maybeSingle();
    await insertVisit(sb, child, { ...data, doctorName: data.doctorName || s?.doctor_name, clinicName: data.clinicName || s?.clinic_name }, "clinic");
    const extras: string[] = [];

    if (data.followUpOn) {
      await sb.from("visits").insert({ kind: "followup", child_id: child.id, clinic_id: child.clinic_id, day: data.followUpOn, status: "booked", slot_label: null });
      extras.push("follow-up booked");
    }

    // Medicine reminders: one WhatsApp message per day at 8 PM IST for the course length (max 10 days).
    if (child.guardian_id) {
      const rows: any[] = [];
      for (const r of data.rx.filter((x) => x.remind && x.days)) {
        for (let i = 0; i < Math.min(10, r.days ?? 0); i++) {
          const day = new Date(Date.parse(data.visitDate + "T14:30:00Z") + i * 86400000).toISOString();
          const line = `${r.medicine}${r.dose ? " " + r.dose : ""}${r.frequency ? " (" + r.frequency + ")" : ""}`;
          rows.push({
            guardian_id: child.guardian_id, clinic_id: child.clinic_id, direction: "out", kind: "medicine", status: "scheduled", scheduled_for: day,
            body_en: `💊 Reminder for ${child.name}: ${line}. Day ${i + 1} of ${r.days}.`,
            body_hi: `💊 ${child.name} की दवा: ${line}। दिन ${i + 1} / ${r.days}।`,
          });
        }
      }
      if (rows.length) {
        await sb.from("messages").insert(rows);
        extras.push(`${rows.length} medicine reminders`);
      }

      // Plain-language summary for the parent (AI, with a template fallback).
      const rxLine = data.rx.map((r) => `${r.medicine}${r.dose ? " " + r.dose : ""}${r.frequency ? " " + r.frequency : ""}${r.days ? " × " + r.days + " days" : ""}`).join("; ");
      let en = `Visit summary for ${child.name} (${fmtD(data.visitDate)}): ${data.diagnosis || "check-up"}.${rxLine ? " Medicines: " + rxLine + "." : ""}${data.advice ? " Advice: " + data.advice : ""}${data.followUpOn ? " Next visit: " + fmtD(data.followUpOn) + "." : ""}`;
      let hi = `${child.name} की विज़िट (${fmtD(data.visitDate)}): ${data.diagnosis || "जाँच"}।${rxLine ? " दवाइयाँ: " + rxLine + "।" : ""}${data.followUpOn ? " अगली विज़िट: " + fmtD(data.followUpOn) + "।" : ""}`;
      try {
        const { aiText, extractJson } = await import("./ai.server");
        const out = await aiText(
          "Rewrite a paediatric visit note as a warm, plain-language WhatsApp message for an Indian parent, under 70 words. Keep every medicine, dose and date exactly. No new medical advice. Return ONLY JSON {\"en\":\"...\",\"hi\":\"...\"} (hi in Devanagari).",
          en,
        );
        const j = extractJson<{ en?: string; hi?: string }>(out);
        if (j?.en) { en = j.en.slice(0, 700); hi = (j.hi ?? hi).slice(0, 700); }
      } catch { /* template fallback */ }
      await sb.from("messages").insert({ guardian_id: child.guardian_id, clinic_id: child.clinic_id, direction: "out", kind: "visit_summary", status: "sent", sent_at: new Date().toISOString(), body_en: en, body_hi: hi });
      extras.push("summary sent to parent");
    }

    // Illness-aware vaccine replanning: propose moving the next vaccine visit if it falls within 7 days.
    if (data.isIllness) {
      const today = data.visitDate;
      const soon = new Date(Date.parse(today) + 7 * 86400000).toISOString().slice(0, 10);
      const { data: next } = await a.from("visits").select("id, day").eq("child_id", child.id).in("status", ["booked", "confirmed", "planned"]).neq("kind", "followup").gte("day", today).lte("day", soon).order("day").limit(1).maybeSingle();
      if (next) {
        try {
          const { proposeChildMove } = await import("./followup.server");
          const diff = await proposeChildMove(a, child, next, null, today, 7);
          await sb.from("plan_changes").insert({ child_id: child.id, clinic_id: child.clinic_id, reason: `Unwell at visit (${data.diagnosis || "illness"}) — vaccine visit ${fmtD(next.day)} may need moving`, diff });
          extras.push("vaccine replan sent for approval");
        } catch (e) {
          console.error("replan", e);
        }
      }
    }
    return { ok: true, extras };
  });

export const claimSharedChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ shareToken: z.string().min(10).max(64), clinicId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok } = await (context.supabase as any).rpc("is_staff_of", { _clinic: data.clinicId });
    if (!ok) throw new Error("You are not staff of that clinic");
    const a = await admin();
    const v = await validShare(a, data.shareToken);
    if (v.state !== "ok") throw new Error("This share link is no longer valid");
    if (v.link.clinic_id === data.clinicId) throw new Error("This child is already in your clinic");
    const cid = data.clinicId;
    const { data: src } = await a.from("children").select("*").eq("id", v.link.child_id).single();
    const { data: srcClinic } = await a.from("clinic_settings").select("clinic_name, doctor_name").eq("clinic_id", src.clinic_id).maybeSingle();

    let guardianId: string | null = null;
    if (src.guardian_id) {
      const { data: g } = await a.from("guardians").select("name, phone, lang").eq("id", src.guardian_id).single();
      const { data: ex } = await a.from("guardians").select("id").eq("clinic_id", cid).eq("phone", g.phone).maybeSingle();
      guardianId = ex?.id ?? (await a.from("guardians").insert({ name: g.name, phone: g.phone, lang: g.lang, clinic_id: cid }).select("id").single()).data.id;
    }
    const newToken = randToken(16);
    const { data: nc, error } = await a.from("children").insert({ name: src.name, dob: src.dob, sex: src.sex, guardian_id: guardianId, clinic_id: cid, public_token: newToken }).select("id").single();
    if (error) throw new Error(error.message);
    const nid = nc.id;

    const [{ data: prof }, { data: hvs }, { data: gr }, { data: ms }, { data: docs }, { data: doses }] = await Promise.all([
      a.from("health_profile").select("*").eq("child_id", src.id).maybeSingle(),
      a.from("health_visits").select("*, prescriptions(*)").eq("child_id", src.id),
      a.from("growth_readings").select("*").eq("child_id", src.id),
      a.from("milestones").select("*").eq("child_id", src.id),
      a.from("health_documents").select("*").eq("child_id", src.id),
      a.from("child_doses").select("code, status, due_date, given_on, batch_no, where_given").eq("child_id", src.id),
    ]);
    if (prof) await a.from("health_profile").insert({ child_id: nid, clinic_id: cid, blood_group: prof.blood_group, allergies: prof.allergies, conditions: prof.conditions, birth_weight_kg: prof.birth_weight_kg, notes: prof.notes });
    for (const h of (hvs ?? []) as any[]) {
      const { data: nh } = await a.from("health_visits").insert({
        child_id: nid, clinic_id: cid, visit_date: h.visit_date, doctor_name: h.doctor_name ?? srcClinic?.doctor_name, clinic_name: h.clinic_name ?? srcClinic?.clinic_name,
        symptoms: h.symptoms, diagnosis: h.diagnosis, advice: h.advice, follow_up_on: h.follow_up_on, is_illness: h.is_illness, source: h.source,
      }).select("id").single();
      if (nh && h.prescriptions?.length) await a.from("prescriptions").insert(h.prescriptions.map((r: any) => ({ health_visit_id: nh.id, clinic_id: cid, medicine: r.medicine, dose: r.dose, frequency: r.frequency, days: r.days, remind: false })));
    }
    if (gr?.length) await a.from("growth_readings").insert(gr.map((g: any) => ({ child_id: nid, clinic_id: cid, measured_on: g.measured_on, weight_kg: g.weight_kg, height_cm: g.height_cm, head_cm: g.head_cm, source: g.source })));
    if (ms?.length) await a.from("milestones").insert(ms.map((m: any) => ({ child_id: nid, clinic_id: cid, code: m.code, achieved_on: m.achieved_on })));
    if (docs?.length) await a.from("health_documents").insert(docs.map((d: any) => ({ child_id: nid, clinic_id: cid, kind: d.kind, title: d.title, doc_date: d.doc_date, file_path: d.file_path, source: d.source })));
    if (doses?.length)
      await a.from("child_doses").insert(doses.map((d: any) => ({
        child_id: nid, clinic_id: cid, code: d.code, due_date: d.due_date, given_on: d.given_on, batch_no: d.batch_no,
        status: d.status === "given" ? "given_elsewhere" : d.status === "given_elsewhere" || d.status === "skipped" ? d.status : "planned",
        where_given: d.status === "given" ? srcClinic?.clinic_name ?? d.where_given : d.where_given,
      })));
    await a.from("share_views").insert({ link_id: v.link.id, clinic_id: v.link.clinic_id, viewer: "Added to another clinic on DoseChain" });
    return { childToken: newToken };
  });
