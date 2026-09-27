/**
 * Parent accounts. A signed-in parent is linked to one or more guardian records
 * (parent_links). Linking needs proof: WhatsApp number + a child's date of birth,
 * or the child's private link. Reads use the admin client only after the
 * caller's links are resolved, and never return other families' data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function myGuardianIds(userId: string): Promise<string[]> {
  const a = await admin();
  const { data } = await a.from("parent_links").select("guardian_id").eq("user_id", userId);
  return (data ?? []).map((r) => r.guardian_id);
}

export const getFamily = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const a = await admin();
    const gids = await myGuardianIds(context.userId);
    if (gids.length === 0) return { guardians: [], children: [], visits: [], messages: [] };

    const [{ data: guardians }, { data: kids }] = await Promise.all([
      a.from("guardians").select("id, name, phone").in("id", gids),
      a.from("children").select("id, name, dob, sex, public_token, clinic_id, guardian_id").in("guardian_id", gids).order("dob", { ascending: false }),
    ]);
    const children = kids ?? [];
    const childIds = children.map((c) => c.id);
    const clinicIds = [...new Set(children.map((c) => c.clinic_id))];

    const [{ data: doses }, { data: visits }, { data: clinics }, { data: cat }, { data: msgs }] = await Promise.all([
      childIds.length ? a.from("child_doses").select("child_id, code, status, due_date").in("child_id", childIds) : Promise.resolve({ data: [] as any[] }),
      childIds.length
        ? a.from("visits").select("id, child_id, day, slot_label, status").in("child_id", childIds).in("status", ["planned", "booked", "confirmed"]).order("day")
        : Promise.resolve({ data: [] as any[] }),
      clinicIds.length ? a.from("clinics").select("id, name").in("id", clinicIds) : Promise.resolve({ data: [] as any[] }),
      a.from("vaccine_doses").select("code, label_en, label_hi"),
      a.from("messages").select("id, guardian_id, direction, body_en, body_hi, sent_at, created_at, status").in("guardian_id", gids).eq("status", "sent").order("created_at", { ascending: false }).limit(8),
    ]);

    const clinicName = new Map((clinics ?? []).map((c: any) => [c.id, c.name as string]));
    const label = new Map((cat ?? []).map((c: any) => [c.code, { en: c.label_en as string, hi: c.label_hi as string }]));
    const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

    const out = children.map((c) => {
      const ds = (doses ?? []).filter((d: any) => d.child_id === c.id);
      const done = ds.filter((d: any) => d.status === "given" || d.status === "given_elsewhere").length;
      const upcoming = ds
        .filter((d: any) => (d.status === "planned" || d.status === "booked") && d.due_date)
        .sort((x: any, y: any) => x.due_date.localeCompare(y.due_date));
      const nextDate: string | null = upcoming[0]?.due_date ?? null;
      const nextCodes = upcoming.filter((d: any) => d.due_date === nextDate).map((d: any) => d.code as string);
      return {
        name: c.name,
        dob: c.dob,
        sex: c.sex,
        token: c.public_token,
        clinic: clinicName.get(c.clinic_id) ?? "",
        done,
        total: ds.length,
        nextDate,
        nextBooked: upcoming[0]?.status === "booked",
        overdue: !!nextDate && nextDate < today,
        nextLabels: nextCodes.map((code) => label.get(code) ?? { en: code, hi: code }),
      };
    });
    const tokenById = new Map(children.map((c) => [c.id, { token: c.public_token, name: c.name }]));

    return {
      guardians: (guardians ?? []).map((g) => ({ id: g.id, name: g.name, phone: g.phone })),
      children: out,
      visits: (visits ?? []).map((v: any) => ({ id: v.id, day: v.day, slot: v.slot_label, status: v.status, child: tokenById.get(v.child_id)?.name ?? "", token: tokenById.get(v.child_id)?.token ?? "" })),
      messages: (msgs ?? []).map((m: any) => ({ id: m.id, direction: m.direction, en: m.body_en, hi: m.body_hi, at: m.sent_at ?? m.created_at })),
    };
  });

export const linkByPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ phone: z.string().regex(/^\+91[6-9]\d{9}$/), dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const a = await admin();
    const { data: g } = await a.from("guardians").select("id").eq("phone", data.phone).maybeSingle();
    if (!g) return { ok: false as const };
    // proof: a child under this number must have this date of birth
    const { data: kid } = await a.from("children").select("id").eq("guardian_id", g.id).eq("dob", data.dob).limit(1).maybeSingle();
    if (!kid) return { ok: false as const };
    await a.from("parent_links").upsert({ user_id: context.userId, guardian_id: g.id }, { onConflict: "user_id,guardian_id" });
    return { ok: true as const };
  });

export const linkByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(3).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await admin();
    const { data: kid } = await a.from("children").select("guardian_id").eq("public_token", data.token).maybeSingle();
    if (!kid?.guardian_id) return { ok: false as const };
    await a.from("parent_links").upsert({ user_id: context.userId, guardian_id: kid.guardian_id }, { onConflict: "user_id,guardian_id" });
    return { ok: true as const };
  });
