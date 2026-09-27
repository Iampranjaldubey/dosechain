/**
 * Follow-through core: reminder sweep, bite watchdog, parent-reply handling and
 * applying doctor-approved plan changes. Server-only; callers pass the client.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { addDays, buildPlan, reshuffle, snapToOpd, type DoseDef, type EngineSettings } from "./dosechain";
import { rescheduleMissedDose, type BiteDosePlan, type BiteWindows } from "./bitelane";
import { parseReply } from "./parse-reply.server";

type Db = any;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export async function nowIso(a: Db): Promise<string> {
  const { data } = await a.from("app_clock").select("demo_now").eq("id", 1).single();
  return data?.demo_now ?? new Date().toISOString();
}
export function todayIst(iso: string): string {
  return new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

async function loadSettings(a: Db) {
  const { data } = await a.from("clinic_settings").select("*").eq("id", 1).single();
  const s = data as any;
  const opdDays: number[] = [];
  const bite: BiteWindows = {};
  WEEKDAYS.forEach((n, i) => {
    if ((s.opd_hours?.[n] ?? []).length > 0) opdDays.push(i);
    bite[i] = s.bite_windows?.[n] ?? [];
  });
  const eng: EngineSettings = {
    opdDays,
    holidays: s.holidays ?? [],
    rotaBrand: s.rota_brand ?? "RV5",
    hepaType: s.hepa_type ?? "inactivated",
  };
  return { s, eng, bite };
}

async function send(a: Db, guardianId: string, kind: string, en: string, hi: string, extra: Record<string, unknown> = {}) {
  await a.from("messages").insert({
    guardian_id: guardianId,
    direction: "out",
    kind,
    body_en: en,
    body_hi: hi,
    status: "sent",
    sent_at: new Date().toISOString(),
    ...extra,
  });
}

const fmt = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// ---------------- reminder sweep + watchdog ----------------

export async function runAutomations(a: Db) {
  const today = todayIst(await nowIso(a));
  const tomorrow = addDays(today, 1);
  const { s, bite } = await loadSettings(a);
  const counts = { reminders: 0, biteReminders: 0, rescues: 0, scheduledSent: 0 };
  const nowStr = await nowIso(a);

  // 0. deliver scheduled messages whose time has come (demo clock aware)
  const { data: dueMsgs } = await a.from("messages").select("id").eq("status", "scheduled").lte("scheduled_for", nowStr);
  for (const m of (dueMsgs ?? []) as any[]) {
    await a.from("messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", m.id);
    await a.from("impact_events").insert({ kind: "reminder_sent", minutes_saved: s.mins_per_recall_call ?? 4 });
    counts.scheduledSent++;
  }

  // 1. vaccine reminders for tomorrow (booked or confirmed)
  const { data: visits } = await a
    .from("visits")
    .select("id, day, slot_label, child_id, children(name, guardian_id)")
    .eq("kind", "vaccine")
    .eq("day", tomorrow)
    .in("status", ["booked", "confirmed"]);
  for (const v of (visits ?? []) as any[]) {
    const { count } = await a.from("messages").select("id", { count: "exact", head: true }).eq("visit_id", v.id).eq("kind", "reminder_1d").neq("status", "scheduled");
    if (count || !v.children) continue;
    await a.from("messages").delete().eq("visit_id", v.id).eq("kind", "reminder_1d").eq("status", "scheduled");
    await send(
      a,
      v.children.guardian_id,
      "reminder_1d",
      `Reminder: ${v.children.name}'s vaccines are tomorrow (${fmt(v.day)}) at ${v.slot_label ?? "OPD"}. Reply YES to confirm, or tell us if the child is unwell.`,
      `याद दिलाना: ${v.children.name} के टीके कल (${fmt(v.day)}) ${v.slot_label ?? "OPD"} पर हैं। पुष्टि के लिए "हाँ" लिखें, या बच्चा बीमार हो तो बताएं।`,
      { visit_id: v.id, quick_replies: ["Yes / हाँ", "Fever / बुखार है", "Change date / तारीख बदलें"] },
    );
    await a.from("impact_events").insert({ kind: "reminder_sent", minutes_saved: s.mins_per_recall_call ?? 4 });
    counts.reminders++;
  }

  // 2. bite reminders for doses due today/tomorrow
  const { data: due } = await a
    .from("bite_doses")
    .select("id, day_offset, due_date, bite_cases!inner(patient_name, guardian_id, status)")
    .in("due_date", [today, tomorrow])
    .eq("status", "booked")
    .gt("day_offset", 0)
    .eq("bite_cases.status", "active");
  for (const d of (due ?? []) as any[]) {
    const { count } = await a.from("messages").select("id", { count: "exact", head: true }).contains("parsed", { bite_dose_id: d.id });
    if (count) continue;
    const when = d.due_date === today ? "today" : "tomorrow";
    const whenHi = d.due_date === today ? "आज" : "कल";
    await send(
      a,
      d.bite_cases.guardian_id,
      "bite_reminder",
      `${d.bite_cases.patient_name}: day-${d.day_offset} rabies dose is due ${when}. Please come in the bite window (morning 10:00–10:45 AM or evening 5:30–6:00 PM IST). Do not skip — the gap matters.`,
      `${d.bite_cases.patient_name}: रेबीज़ का दिन-${d.day_offset} टीका ${whenHi} है। कृपया बाइट विंडो (सुबह 10:00–10:45 या शाम 5:30–6:00 IST) में आएं। टीका न छोड़ें।`,
      { parsed: { bite_dose_id: d.id } },
    );
    await a.from("impact_events").insert({ kind: "reminder_sent", minutes_saved: s.mins_per_recall_call ?? 4 });
    counts.biteReminders++;
  }

  // 3. watchdog: missed bite doses
  const { data: missed } = await a
    .from("bite_doses")
    .select("id, bite_case_id, day_offset, due_date, visit_id, bite_cases!inner(patient_name, guardian_id, status)")
    .lt("due_date", today)
    .in("status", ["booked", "planned"])
    .eq("bite_cases.status", "active");
  for (const m of (missed ?? []) as any[]) {
    const { count } = await a
      .from("plan_changes")
      .select("id", { count: "exact", head: true })
      .eq("bite_case_id", m.bite_case_id)
      .eq("status", "pending");
    if (count) continue;
    if (m.visit_id) await a.from("visits").update({ status: "missed" }).eq("id", m.visit_id);
    const { data: all } = await a.from("bite_doses").select("*").eq("bite_case_id", m.bite_case_id).order("day_offset");
    const rows = (all ?? []) as any[];
    const plans: BiteDosePlan[] = rows.map((r) => ({ offset: r.day_offset, date: r.due_date, window: null }));
    const idx = rows.findIndex((r) => r.id === m.id);
    const next = rescheduleMissedDose(plans, idx, today, bite, s.holidays ?? []);
    const changes = rows
      .map((r, i) => ({ doseId: r.id, offset: r.day_offset, oldDate: r.due_date, newDate: next[i]!.date }))
      .filter((c, i) => i >= idx && c.oldDate !== c.newDate);
    const diff = { type: "bite", patient: m.bite_cases.patient_name, changes };
    const { data: pc } = await a
      .from("plan_changes")
      .insert({ bite_case_id: m.bite_case_id, reason: `Missed day-${m.day_offset} dose (${fmt(m.due_date)})`, diff })
      .select("id")
      .single();
    const newDate = changes[0]?.newDate ?? today;
    await send(
      a,
      m.bite_cases.guardian_id,
      "bite_rescue",
      `${m.bite_cases.patient_name}, we missed you for the day-${m.day_offset} rabies dose. It is still effective if taken soon — please come on ${fmt(newDate)} in the bite window. Reply OK.`,
      `${m.bite_cases.patient_name}, दिन-${m.day_offset} का रेबीज़ टीका छूट गया। जल्दी लेने पर भी असरदार है — कृपया ${fmt(newDate)} को बाइट विंडो में आएं। "OK" लिखें।`,
      { quick_replies: ["OK", "Call me / कॉल करें"] },
    );
    if (s.auto_approve_bite_rebook && pc) await applyPlanChange(a, pc.id);
    counts.rescues++;
  }
  return { today, ...counts };
}

// ---------------- parent replies ----------------

export async function resolveToken(a: Db, token: string) {
  const { data: child } = await a.from("children").select("id, name, dob, guardian_id, guardians(name, lang)").eq("public_token", token).maybeSingle();
  if (child) return { kind: "child" as const, child, guardianId: child.guardian_id as string, name: child.name as string, lang: (child.guardians?.lang ?? "hi") as string };
  const { data: bc } = await a.from("bite_cases").select("id, patient_name, guardian_id, guardians(name, lang)").eq("public_token", token).maybeSingle();
  if (bc) return { kind: "bite" as const, bite: bc, guardianId: bc.guardian_id as string, name: bc.patient_name as string, lang: (bc.guardians?.lang ?? "hi") as string };
  return null;
}

export async function handleReply(a: Db, token: string, text: string) {
  const who = await resolveToken(a, token);
  if (!who) throw new Error("Not found");
  const today = todayIst(await nowIso(a));

  let visit: any = null;
  if (who.kind === "child") {
    const { data } = await a
      .from("visits")
      .select("id, day, slot_label")
      .eq("child_id", who.child.id)
      .in("status", ["booked", "confirmed"])
      .gte("day", today)
      .order("day")
      .limit(1)
      .maybeSingle();
    visit = data;
  }

  const parsed = await parseReply(text, today, visit?.day ?? null);
  const { data: inMsg } = await a
    .from("messages")
    .insert({ guardian_id: who.guardianId, direction: "in", kind: "reply", body_en: text, body_hi: text, parsed, status: "received", sent_at: new Date().toISOString(), visit_id: visit?.id ?? null })
    .select("id")
    .single();

  if (parsed.intent === "confirm") {
    if (visit) await a.from("visits").update({ status: "confirmed" }).eq("id", visit.id);
    await send(a, who.guardianId, "ack", "Thank you! See you at the clinic. 🙏", "धन्यवाद! क्लिनिक में मिलते हैं। 🙏");
    await a.from("impact_events").insert({ kind: "auto_confirm", minutes_saved: 4 });
    return { parsed };
  }

  if ((parsed.intent === "sick" || parsed.intent === "reschedule") && who.kind === "child" && visit) {
    const change = await proposeChildMove(a, who.child, visit, parsed.date, today, parsed.intent === "sick" ? 7 : 3);
    await a.from("plan_changes").insert({
      child_id: who.child.id,
      reason: parsed.intent === "sick" ? `Parent says: unwell — "${text.slice(0, 80)}"` : `Parent asked to reschedule — "${text.slice(0, 80)}"`,
      source_message_id: inMsg?.id ?? null,
      diff: change,
    });
    const en = parsed.intent === "sick"
      ? `Get well soon, ${who.name}! 💚 Vaccines are best given when the child is well. We suggest ${fmt(change.toDay)} — Dr. will confirm shortly and the rest of the plan stays on track.`
      : `No problem. We suggest ${fmt(change.toDay)} — Dr. will confirm shortly.`;
    const hi = parsed.intent === "sick"
      ? `${who.name} जल्दी ठीक हो जाए! 💚 टीके स्वस्थ होने पर लगते हैं। हम ${fmt(change.toDay)} सुझाते हैं — डॉक्टर जल्द पुष्टि करेंगे, बाकी योजना समय पर रहेगी।`
      : `कोई बात नहीं। हम ${fmt(change.toDay)} सुझाते हैं — डॉक्टर जल्द पुष्टि करेंगे।`;
    await send(a, who.guardianId, "ack", en, hi);
    return { parsed };
  }

  // Question / hesitancy: AI drafts a calm, guideline-based reply for the doctor to approve.
  let draft: { en: string; hi: string } | null = null;
  try {
    const { aiText, extractJson } = await import("./ai.server");
    const out = await aiText(
      `You help an Indian paediatrician reply to a parent's WhatsApp question about vaccines (often vaccine hesitancy, side effects, fever after vaccine, missed doses).
Write a calm, warm, factual reply under 60 words based on IAP / WHO guidance. Never diagnose; for danger signs (breathing trouble, seizures, high fever >3 days) tell them to come in now or call the clinic.
Return ONLY JSON {"en":"...","hi":"..."} where hi is natural Hindi in Devanagari.`,
      `Child/patient: ${who.name}. Parent wrote: "${text}"`,
    );
    const j = extractJson<{ en?: string; hi?: string }>(out);
    if (j?.en) draft = { en: j.en.slice(0, 600), hi: (j.hi ?? j.en).slice(0, 600) };
  } catch (e) {
    console.error("draft", e);
  }
  if (draft && inMsg) await a.from("messages").update({ draft_reply: draft }).eq("id", inMsg.id);
  await send(a, who.guardianId, "ack", "Thanks — the doctor will reply shortly.", "धन्यवाद — डॉक्टर जल्द जवाब देंगे।");
  return { parsed };
}

async function proposeChildMove(a: Db, child: any, visit: any, requested: string | null, today: string, defaultShift: number) {
  const { eng } = await loadSettings(a);
  const [{ data: cat }, { data: doses }] = await Promise.all([
    a.from("vaccine_doses").select("*").order("sort"),
    a.from("child_doses").select("code, status, given_on, visit_id").eq("child_id", child.id),
  ]);
  const catalogue: DoseDef[] = ((cat ?? []) as any[]).map((r) => ({
    code: r.code, series: r.series ?? r.code, recAgeD: r.rec_age_d ?? 0, minAgeD: r.min_age_d ?? 0, minGapPrevD: r.min_gap_prev_d, isLive: r.is_live ?? false,
  }));
  const rows = (doses ?? []) as any[];
  const history = rows.filter((d) => (d.status === "given" || d.status === "given_elsewhere") && d.given_on).map((d) => ({ code: d.code, givenOn: d.given_on }));
  const bookedCodes = rows.filter((d) => d.visit_id === visit.id).map((d) => d.code);
  const later = buildPlan(child.dob, [...history, ...bookedCodes.map((c) => ({ code: c, givenOn: visit.day }))], catalogue, eng, visit.day).slice(0, 6);
  const visits = [{ date: visit.day, doses: bookedCodes, status: "planned" as const, flags: [] as string[] }, ...later];
  const target = snapToOpd(requested && requested > today ? requested : addDays(visit.day, defaultShift), eng);
  const res = reshuffle(child.dob, history, visits, 0, target, catalogue, eng, today);
  const toDay = res.visits[0]?.date ?? target;
  return { type: "child", childName: child.name, visitId: visit.id, fromDay: visit.day, toDay, entries: res.diff, stillOnTrack: res.stillOnTrack };
}

// ---------------- apply approved change ----------------

export async function applyPlanChange(a: Db, id: string) {
  const { data: pc } = await a.from("plan_changes").select("*").eq("id", id).single();
  if (!pc || pc.status !== "pending") throw new Error("Change is not pending");
  const diff = pc.diff as any;
  let guardianId: string | null = null;
  if (diff.type === "child") {
    await a.from("visits").update({ day: diff.toDay, status: "booked" }).eq("id", diff.visitId);
    for (const e of diff.entries ?? []) await a.from("child_doses").update({ due_date: e.newDate }).eq("child_id", pc.child_id).eq("code", e.dose);
    const { data: c } = await a.from("children").select("guardian_id, name").eq("id", pc.child_id).single();
    guardianId = c?.guardian_id ?? null;
    if (guardianId)
      await send(a, guardianId, "plan_confirmed", `Dr. confirmed: ${c.name}'s visit moved to ${fmt(diff.toDay)}. The full vaccine plan has been updated and stays on track. ✅`, `डॉक्टर ने पुष्टि की: ${c.name} की विज़िट ${fmt(diff.toDay)} को। पूरी टीका योजना अपडेट हो गई है। ✅`);
    await a.from("impact_events").insert({ kind: "auto_replan", minutes_saved: 10 });
  } else if (diff.type === "bite") {
    for (const c of diff.changes ?? []) await a.from("bite_doses").update({ due_date: c.newDate, status: "booked", visit_id: null }).eq("id", c.doseId);
    const { data: b } = await a.from("bite_cases").select("guardian_id, patient_name").eq("id", pc.bite_case_id).single();
    guardianId = b?.guardian_id ?? null;
    const first = diff.changes?.[0];
    if (guardianId && first)
      await send(a, guardianId, "plan_confirmed", `Confirmed: ${b.patient_name}'s day-${first.offset} rabies dose is on ${fmt(first.newDate)}. Later doses shifted to keep the right gaps. ✅`, `पुष्टि: ${b.patient_name} का दिन-${first.offset} रेबीज़ टीका ${fmt(first.newDate)} को। आगे के टीके सही अंतर के साथ बदले गए। ✅`);
    await a.from("impact_events").insert({ kind: "bite_rescue", minutes_saved: 10 });
  }
  await a.from("plan_changes").update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}
