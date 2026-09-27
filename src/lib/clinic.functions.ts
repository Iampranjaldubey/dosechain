/** Clinic staff server functions — all require a signed-in staff session. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const whoAmI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("claim_doctor_if_none");
    const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    return { roles: ((data ?? []) as { role: string }[]).map((r) => r.role) };
  });

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { nowIso, todayIst } = await import("./followup.server");
    const now = await nowIso(sb);
    const today = todayIst(now);
    const [visits, bites, vials, pending, impact, clock] = await Promise.all([
      sb.from("visits").select("id, kind, day, slot_label, status, children(name, public_token), bite_cases(patient_name, public_token)").eq("day", today).order("slot_label"),
      sb.from("bite_cases").select("id, patient_name, age_years, category, animal, bitten_on, public_token, bite_doses(id, day_offset, due_date, status)").eq("status", "active").order("bitten_on", { ascending: false }),
      sb.from("vials").select("*").order("opened_at", { ascending: false }).limit(3),
      sb.from("plan_changes").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("impact_events").select("kind, minutes_saved, created_at").gte("created_at", new Date(Date.now() - 28 * 864e5).toISOString()),
      sb.from("app_clock").select("demo_now").eq("id", 1).single(),
    ]);
    const ev = (impact.data ?? []) as { kind: string; minutes_saved: number }[];
    return {
      now,
      today,
      demoClock: clock.data?.demo_now ?? null,
      visits: visits.data ?? [],
      bites: bites.data ?? [],
      vials: vials.data ?? [],
      pendingCount: pending.count ?? 0,
      impact: {
        minutes: ev.reduce((s, e) => s + (e.minutes_saved ?? 0), 0),
        reminders: ev.filter((e) => e.kind === "reminder_sent").length,
        replans: ev.filter((e) => e.kind === "auto_replan" || e.kind === "bite_rescue").length,
        confirms: ev.filter((e) => e.kind === "auto_confirm").length,
      },
    };
  });

export const runAutomationsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runAutomations } = await import("./followup.server");
    return runAutomations(context.supabase);
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
    const { data: isDoctor } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "doctor" });
    if (!isDoctor) throw new Error("Only the doctor can approve plan changes.");
    const sb = context.supabase as any;
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
      .select("id, direction, kind, body_en, created_at, parsed, guardians(name, children(name, public_token), bite_cases(patient_name, public_token))")
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });
