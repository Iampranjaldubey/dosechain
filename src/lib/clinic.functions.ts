/** Clinic staff server functions — all require a signed-in staff session. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface Membership { clinicId: string; clinicName: string; role: string }

export const whoAmI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("user_roles")
      .select("role, clinic_id, clinics(name)")
      .eq("user_id", context.userId);
    const memberships: Membership[] = ((data ?? []) as any[]).map((r) => ({
      clinicId: r.clinic_id,
      clinicName: r.clinics?.name ?? "Clinic",
      role: r.role,
    }));
    return { memberships, email: (context.claims as any)?.email ?? "" };
  });

export const createClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(2).max(120), city: z.string().max(80).optional(), phone: z.string().max(20).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: cid, error } = await (context.supabase as any).rpc("create_clinic", { _name: data.name, _city: data.city ?? "", _phone: data.phone ?? "" });
    if (error) throw new Error(error.message);
    return { clinicId: cid as string };
  });

export const listJoinableClinics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).from("clinics").select("id, name, city").order("name");
    return (data ?? []) as { id: string; name: string; city: string | null }[];
  });

export const requestJoinClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinicId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("request_join_clinic", { _clinic: data.clinicId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStaffRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).from("staff_requests").select("user_id, email, created_at").order("created_at");
    return (data ?? []) as { user_id: string; email: string | null; created_at: string }[];
  });

export const listClinicStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinicId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await (context.supabase as any)
      .from("user_roles").select("user_id, role").eq("clinic_id", data.clinicId).order("role");
    return (rows ?? []) as { user_id: string; role: string }[];
  });

export const approveStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinicId: z.string().uuid(), userId: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("approve_staff", { _user_id: data.userId, _clinic: data.clinicId, _approve: data.approve });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { nowIso, todayIst } = await import("./followup.server");
    const now = await nowIso(sb);
    const today = todayIst(now);
    const [visits, bites, vials, pending, impact, clock] = await Promise.all([
      sb.from("visits").select("id, kind, day, slot_label, status, bite_case_id, children(name, public_token)").eq("day", today).order("slot_label"),
      sb.from("bite_cases").select("id, patient_name, age_years, category, animal, bitten_on, public_token, bite_doses(id, day_offset, due_date, status)").eq("status", "active").order("bitten_on", { ascending: false }),
      sb.from("vials").select("*").order("opened_at", { ascending: false }).limit(3),
      sb.from("plan_changes").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("impact_events").select("kind, minutes_saved, created_at").gte("created_at", new Date(Date.now() - 28 * 864e5).toISOString()),
      sb.from("app_clock").select("demo_now").eq("id", 1).single(),
    ]);
    const { data: recallRaw } = await sb.from("visits").select("id, day, status, children(name, public_token)").eq("kind", "vaccine").or(`status.eq.missed,and(status.in.(booked,confirmed),day.lt.${today})`).order("day").limit(15);
    const { data: newRaw } = await sb.from("visits").select("id, day, slot_label, children(name, public_token)").eq("kind", "vaccine").eq("status", "booked").gte("day", today).order("day").limit(20);
    const { count: scheduledCount } = await sb.from("messages").select("id", { count: "exact", head: true }).eq("status", "scheduled");
    const caseById = new Map(((bites.data ?? []) as any[]).map((b) => [b.id, b]));
    const visitRows = ((visits.data ?? []) as any[]).map((v) => ({ ...v, bite_cases: v.bite_case_id ? caseById.get(v.bite_case_id) ?? null : null }));
    const ev = (impact.data ?? []) as { kind: string; minutes_saved: number }[];
    return {
      now,
      today,
      demoClock: clock.data?.demo_now ?? null,
      visits: visitRows,
      bites: bites.data ?? [],
      vials: vials.data ?? [],
      pendingCount: pending.count ?? 0,
      scheduledCount: scheduledCount ?? 0,
      newBookings: ((newRaw ?? []) as any[]).filter((r) => r.children).map((r) => ({ id: r.id, day: r.day, slot: r.slot_label, name: r.children.name, token: r.children.public_token })),
      recall: ((recallRaw ?? []) as any[]).filter((r) => r.children).map((r) => ({ id: r.id, day: r.day, status: r.status, name: r.children.name, token: r.children.public_token, daysLate: Math.round((Date.parse(today) - Date.parse(r.day)) / 864e5) })),
      vialsUsedToday: ((vials.data ?? []) as any[]).filter((v) => todayIst(v.opened_at) === today).reduce((n, v) => n + (v.sites_used ?? 0), 0),
      impact: {
        minutes: ev.reduce((s, e) => s + (e.minutes_saved ?? 0), 0),
        reminders: ev.filter((e) => e.kind === "reminder_sent" || e.kind === "recall_call_avoided").length,
        replans: ev.filter((e) => ["auto_replan", "replan_automated", "bite_rescue", "bite_course_completed"].includes(e.kind)).length,
        confirms: ev.filter((e) => e.kind === "auto_confirm").length,
        vialDoses: ev.filter((e) => e.kind === "vial_dose_saved").length,
      },
    };
  });

export const runAutomationsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinicId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { runAutomations } = await import("./followup.server");
    return runAutomations(context.supabase, data?.clinicId);
  });

export const setDemoClock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(-30).max(60).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let demo: string | null = null;
    if (data.days !== null) {
      const { data: c } = await sb.from("app_clock").select("demo_now").eq("id", 1).single();
      const base = c?.demo_now ? new Date(c.demo_now) : new Date();
      demo = new Date(base.getTime() + data.days * 864e5).toISOString();
    }
    await sb.from("app_clock").update({ demo_now: demo }).eq("id", 1);
    return { demoNow: demo };
  });

export const setVisitStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["checked_in", "done", "missed"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await sb.from("visits").update({ status: data.status, ...(data.status === "checked_in" ? { checked_in_at: new Date().toISOString() } : {}) }).eq("id", data.id);
    if (data.status === "done") {
      const today = new Date().toISOString().slice(0, 10);
      await sb.from("child_doses").update({ status: "given", given_on: today }).eq("visit_id", data.id);
    }
    return { ok: true };
  });

export const decideBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: v } = await sb.from("visits").select("id, day, slot_label, children(name, guardian_id)").eq("id", data.id).single();
    if (!v) throw new Error("Booking not found");
    await sb.from("visits").update({ status: data.approve ? "confirmed" : "cancelled" }).eq("id", data.id);
    const g = v.children?.guardian_id;
    if (g) {
      const name = v.children.name;
      const when = `${new Date(v.day + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}${v.slot_label ? ", " + v.slot_label : ""}`;
      await sb.from("messages").insert({
        guardian_id: g, direction: "out", kind: data.approve ? "booking_confirmed" : "booking_declined", visit_id: v.id, status: "sent", sent_at: new Date().toISOString(),
        body_en: data.approve ? `✅ ${name}'s vaccine visit is confirmed for ${when}. See you at the clinic!` : `Sorry, we couldn't keep ${name}'s slot on ${when}. Please reply and we'll find another time.`,
        body_hi: data.approve ? `✅ ${name} का टीकाकरण ${when} को पक्का हो गया है। क्लिनिक में मिलते हैं!` : `माफ़ कीजिए, ${name} का ${when} का समय नहीं हो पाएगा। जवाब दें, हम दूसरा समय देंगे।`,
      });
      if (data.approve) {
        // schedule the day-before reminder for 18:00 IST; the reminder sweep delivers it
        const eve = new Date(Date.parse(v.day + "T12:30:00Z") - 864e5).toISOString();
        await sb.from("messages").insert({
          guardian_id: g, direction: "out", kind: "reminder_1d", visit_id: v.id, status: "scheduled", scheduled_for: eve,
          quick_replies: ["Yes / हाँ", "Fever / बुखार है", "Change date / तारीख बदलें"],
          body_en: `Reminder: ${name}'s vaccines are tomorrow (${when}). Reply YES to confirm, or tell us if the child is unwell.`,
          body_hi: `याद दिलाना: ${name} के टीके कल (${when}) हैं। पुष्टि के लिए "हाँ" लिखें, या बच्चा बीमार हो तो बताएं।`,
        });
      } else {
        await sb.from("messages").delete().eq("visit_id", v.id).eq("status", "scheduled");
      }
    }
    return { ok: true };
  });

export const giveBiteDose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ doseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const now = new Date().toISOString();
    let { data: vial } = await sb.from("vials").select("*").gt("expires_at", now).order("opened_at", { ascending: false }).limit(1).maybeSingle();
    if (!vial || vial.sites_used >= vial.sites_total) {
      const { data: nv } = await sb.from("vials").insert({ opened_at: now, expires_at: new Date(Date.now() + 8 * 3600e3).toISOString(), sites_total: 8, sites_used: 0, batch_no: "RV-2026-" + Math.floor(Math.random() * 900 + 100) }).select("*").single();
      vial = nv;
    }
    await sb.from("vials").update({ sites_used: vial.sites_used + 1 }).eq("id", vial.id);
    const { data: dose } = await sb.from("bite_doses").update({ status: "given", given_at: now, vial_id: vial.id }).eq("id", data.doseId).select("bite_case_id").single();
    if (dose) {
      const { count } = await sb.from("bite_doses").select("id", { count: "exact", head: true }).eq("bite_case_id", dose.bite_case_id).neq("status", "given");
      if (!count) await sb.from("bite_cases").update({ status: "completed" }).eq("id", dose.bite_case_id);
    }
    return { ok: true };
  });

export const listApprovals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("plan_changes")
      .select("id, reason, diff, status, created_at, decided_at")
      .order("created_at", { ascending: false })
      .limit(40);
    return data ?? [];
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: pc } = await sb.from("plan_changes").select("clinic_id").eq("id", data.id).single();
    if (!pc) throw new Error("Change not found");
    const { data: isDoctor } = await sb.rpc("is_clinic_doctor", { _clinic: pc.clinic_id });
    if (!isDoctor) throw new Error("Only this clinic's doctor can approve plan changes.");
    if (data.approve) {
      const { applyPlanChange } = await import("./followup.server");
      await applyPlanChange(sb, data.id);
    }
    else await sb.from("plan_changes").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const listThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb
      .from("messages")
      .select("id, direction, kind, body_en, created_at, parsed, draft_reply, status, guardians(name, children(name, public_token), bite_cases(patient_name, public_token))")
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

// ---------- risk radar + morning briefing ----------
async function computeRisk(sb: any) {
  const { nowIso, todayIst } = await import("./followup.server");
  const { riskScore } = await import("./risk");
  const { addDays } = await import("./dosechain");
  const today = todayIst(await nowIso(sb));
  const horizon = addDays(today, 3);
  const rows: { id: string; name: string; kind: "vaccine" | "bite"; due: string; token: string | null; guardianId: string | null; score: number; level: string; reasons: string[] }[] = [];

  const { data: visits } = await sb.from("visits").select("id, day, status, paid_at, child_id, children(name, public_token, guardian_id)").eq("kind", "vaccine").in("status", ["booked", "confirmed"]).lte("day", horizon).gte("day", addDays(today, -14));
  for (const v of (visits ?? []) as any[]) {
    if (!v.children) continue;
    const [{ count: misses }, { data: msgs }] = await Promise.all([
      sb.from("visits").select("id", { count: "exact", head: true }).eq("child_id", v.child_id).eq("status", "missed"),
      sb.from("messages").select("direction, created_at").eq("guardian_id", v.children.guardian_id).order("created_at", { ascending: false }).limit(6),
    ]);
    let unanswered = 0;
    for (const m of (msgs ?? []) as any[]) { if (m.direction === "in") break; unanswered++; }
    const r = riskScore({ kind: "vaccine", daysOverdue: Math.max(0, (Date.parse(today) - Date.parse(v.day)) / 864e5), pastMisses: misses ?? 0, unansweredReminders: Math.min(unanswered, 3), confirmed: v.status === "confirmed", paid: !!v.paid_at });
    rows.push({ id: v.id, name: v.children.name, kind: "vaccine", due: v.day, token: v.children.public_token, guardianId: v.children.guardian_id, ...r });
  }
  const { data: doses } = await sb.from("bite_doses").select("id, day_offset, due_date, status, bite_cases!inner(patient_name, public_token, guardian_id, category, status)").in("status", ["booked", "planned"]).lte("due_date", horizon).eq("bite_cases.status", "active").gt("day_offset", 0);
  for (const d of (doses ?? []) as any[]) {
    const overdue = Math.max(0, (Date.parse(today) - Date.parse(d.due_date)) / 864e5);
    const r = riskScore({ kind: "bite", daysOverdue: overdue, pastMisses: overdue > 0 ? 1 : 0, unansweredReminders: 1, biteCategory: d.bite_cases.category, confirmed: false, paid: false });
    rows.push({ id: d.id, name: `${d.bite_cases.patient_name} · day-${d.day_offset}`, kind: "bite", due: d.due_date, token: d.bite_cases.public_token, guardianId: d.bite_cases.guardian_id, ...r });
  }
  rows.sort((x, y) => y.score - x.score);
  return { today, rows };
}

export const getRiskRadar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await computeRisk(context.supabase)).rows.slice(0, 12));

export const getBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { today, rows } = await computeRisk(sb);
    const [{ count: visitsToday }, { count: pending }, { count: questions }] = await Promise.all([
      sb.from("visits").select("id", { count: "exact", head: true }).eq("day", today),
      sb.from("plan_changes").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("messages").select("id", { count: "exact", head: true }).not("draft_reply", "is", null).eq("status", "received"),
    ]);
    const high = rows.filter((r) => r.level === "high");
    const facts = { visitsToday, pendingApprovals: pending, questionsWaiting: questions, highRisk: high.slice(0, 5).map((h) => `${h.name} (${h.reasons.join(", ")})`), bitesDue: rows.filter((r) => r.kind === "bite").length };
    const fallback = `${visitsToday ?? 0} visits today · ${facts.bitesDue} rabies doses due soon · ${high.length} likely no-shows${high[0] ? ` (top: ${high[0].name})` : ""} · ${pending ?? 0} plan changes and ${questions ?? 0} parent questions waiting for you.`;
    try {
      const { aiText } = await import("./ai.server");
      const text = await aiText(
        "You are the clinic's chief of staff. Write the paediatrician's morning briefing: 3 short bullet lines starting with '• ', most urgent first (rabies safety > overdue infants > admin). Under 70 words. Plain text. Use names given. No greetings.",
        JSON.stringify(facts),
      );
      return { text: text.trim() || fallback, ai: true };
    } catch {
      return { text: fallback, ai: false };
    }
  });

export const nudgeHighRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { rows } = await computeRisk(sb);
    let n = 0;
    for (const r of rows.filter((x) => x.level === "high" && x.guardianId)) {
      await sb.from("messages").insert({
        guardian_id: r.guardianId, direction: "out", kind: "nudge", status: "sent", sent_at: new Date().toISOString(),
        body_en: r.kind === "bite" ? `Important: ${r.name.split(" ·")[0]}'s rabies dose must not be skipped. Reply 1 to confirm today, or 2 and we'll call you.` : `Hi! ${r.name}'s vaccines are waiting. Reply YES to confirm, or tell us a better day — we'll re-plan safely.`,
        body_hi: r.kind === "bite" ? `ज़रूरी: ${r.name.split(" ·")[0]} का रेबीज़ टीका न छोड़ें। आज आने के लिए 1 लिखें, या 2 — हम कॉल करेंगे।` : `नमस्ते! ${r.name} के टीके बाकी हैं। पुष्टि के लिए "हाँ" लिखें, या बेहतर दिन बताएं।`,
        quick_replies: r.kind === "bite" ? ["1 — Coming today", "2 — Call me"] : ["Yes / हाँ", "Change date / तारीख बदलें"],
      });
      await sb.from("impact_events").insert({ kind: "recall_call_avoided", minutes_saved: 4 });
      n++;
    }
    return { sent: n };
  });

export const sendDraftReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ messageId: z.string().uuid(), en: z.string().min(1).max(800), hi: z.string().min(1).max(800) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: m } = await sb.from("messages").select("guardian_id").eq("id", data.messageId).single();
    if (!m) throw new Error("Message not found");
    await sb.from("messages").insert({ guardian_id: m.guardian_id, direction: "out", kind: "doctor_reply", status: "sent", sent_at: new Date().toISOString(), body_en: data.en, body_hi: data.hi });
    await sb.from("messages").update({ status: "answered" }).eq("id", data.messageId);
    await sb.from("impact_events").insert({ kind: "auto_confirm", minutes_saved: 5 });
    return { ok: true };
  });

// ---------- per-clinic settings + saved capacity planner data ----------

export const getClinicSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinicId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s } = await (context.supabase as any)
      .from("clinic_settings")
      .select("clinic_name, doctor_name, city, phone, capacity")
      .eq("clinic_id", data.clinicId)
      .single();
    return s ?? null;
  });

export const saveCapacity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clinicId: z.string().uuid(), capacity: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("clinic_settings")
      .update({ capacity: data.capacity })
      .eq("clinic_id", data.clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
