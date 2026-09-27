/**
 * Parent-facing server functions. Parents never log in — secure token links
 * (/c/:token, /b/:token) are the auth mechanism. Handlers validate the token
 * first, then use the admin client to return a narrow, safe projection.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  buildPlan,
  type DoseDef,
  type EngineSettings,
  type GivenDose,
  type PlannedVisit,
} from "./dosechain";

type AdminClient = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

async function admin(): Promise<AdminClient> {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

/** "now" for planning: demo clock override when set, else real time. */
async function nowIso(): Promise<string> {
  const a = await admin();
  const { data } = await a.from("app_clock").select("demo_now").eq("id", 1).single();
  return data?.demo_now ?? new Date().toISOString();
}

function todayIst(iso: string): string {
  // Asia/Kolkata = UTC+5:30, no DST — a fixed offset is safe.
  return new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface SettingsRow {
  clinic_name: string;
  doctor_name: string;
  city: string;
  phone: string;
  opd_hours: Record<string, [string, string][]>;
  bite_windows: Record<string, [string, string][]>;
  holidays: string[];
  rota_brand: "RV5" | "RV1";
  hepa_type: "inactivated" | "live";
}

function engineSettings(s: SettingsRow): EngineSettings {
  const opdDays: number[] = [];
  WEEKDAYS.forEach((name, i) => {
    if ((s.opd_hours[name] ?? []).length > 0) opdDays.push(i);
  });
  return {
    opdDays,
    holidays: s.holidays ?? [],
    rotaBrand: s.rota_brand,
    hepaType: s.hepa_type,
  };
}

function toDoseDef(r: {
  code: string;
  series: string | null;
  rec_age_d: number | null;
  min_age_d: number | null;
  min_gap_prev_d: number | null;
  is_live: boolean | null;
}): DoseDef {
  return {
    code: r.code,
    series: r.series ?? r.code,
    recAgeD: r.rec_age_d ?? 0,
    minAgeD: r.min_age_d ?? 0,
    minGapPrevD: r.min_gap_prev_d,
    isLive: r.is_live ?? false,
  };
}

async function loadCatalogueAndSettings() {
  const a = await admin();
  const [{ data: cat }, { data: settings }] = await Promise.all([
    a.from("vaccine_doses").select("*").order("sort"),
    a.from("clinic_settings").select("*").eq("id", 1).single(),
  ]);
  if (!cat || !settings) throw new Error("Clinic configuration missing");
  return { cat, settings: settings as unknown as SettingsRow & { id: number } };
}

// ---------- public catalogue for the booking wizard ----------

export const getBookingCatalogue = createServerFn({ method: "GET" }).handler(async () => {
  const { cat, settings } = await loadCatalogueAndSettings();
  return {
    catalogue: (cat as { code: string; label_en: string; label_hi: string; series: string | null; rec_age_d: number; min_age_d: number; min_gap_prev_d: number | null; is_live: boolean; notes: string | null }[]).map((d) => ({
      code: d.code,
      labelEn: d.label_en,
      labelHi: d.label_hi,
      series: d.series ?? d.code,
      recAgeD: d.rec_age_d,
      minAgeD: d.min_age_d,
      minGapPrevD: d.min_gap_prev_d,
      isLive: d.is_live,
      notes: d.notes,
    })),
    settings: {
      clinicName: settings.clinic_name,
      doctorName: settings.doctor_name,
      city: settings.city,
      phone: settings.phone,
      opdHours: settings.opd_hours,
      holidays: settings.holidays,
      rotaBrand: settings.rota_brand,
      hepaType: settings.hepa_type,
    },
  };
});

// ---------- create a booking ----------

const bookingInput = z.object({
  childName: z.string().min(1).max(80),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["girl", "boy"]),
  history: z.array(z.object({ code: z.string(), givenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), where: z.enum(["clinic", "govt"]) })),
  parentName: z.string().min(1).max(80),
  phone: z.string().min(8).max(15),
  lang: z.enum(["en", "hi"]),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotLabel: z.string().min(1).max(40),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data) => bookingInput.parse(data))
  .handler(async ({ data }) => {
    const a = await admin();
    const { cat, settings } = await loadCatalogueAndSettings();
    const today = todayIst(await nowIso());
    const catalogue = cat.map(toDoseDef);
    const eng = engineSettings(settings);

    const history: GivenDose[] = data.history.map((h) => ({ code: h.code, givenOn: h.givenOn }));
    const plan = buildPlan(data.dob, history, catalogue, eng, today);

    // guardian (reuse by phone if exists)
    let guardianId: string;
    const { data: existing } = await a
      .from("guardians")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (existing) {
      guardianId = existing.id;
    } else {
      const { data: g, error } = await a
        .from("guardians")
        .insert({ name: data.parentName, phone: data.phone, lang: data.lang })
        .select("id")
        .single();
      if (error || !g) throw new Error("Could not create guardian");
      guardianId = g.id;
    }

    const token = crypto.randomUUID();
    const { data: child, error: childErr } = await a
      .from("children")
      .insert({
        guardian_id: guardianId,
        name: data.childName,
        dob: data.dob,
        sex: data.sex,
        public_token: token,
      })
      .select("id")
      .single();
    if (childErr || !child) throw new Error("Could not create child record");

    // given doses
    const whereByCode = new Map(data.history.map((h) => [h.code, h.where]));
    const givenRows = data.history.map((h) => ({
      child_id: child.id,
      code: h.code,
      status: "given" as const,
      due_date: h.givenOn,
      given_on: h.givenOn,
      where_given: whereByCode.get(h.code) ?? "clinic",
    }));
    if (givenRows.length > 0) await a.from("child_doses").insert(givenRows);

    // first visit + its doses as booked
    const first = plan[0];
    let visitId: string | null = null;
    if (first) {
      const { data: visit, error: vErr } = await a
        .from("visits")
        .insert({
          kind: "vaccine",
          child_id: child.id,
          day: data.slotDate,
          starts_at: `${data.slotDate}T${data.slotLabel.split("–")[0]}:00+05:30`,
          slot_label: data.slotLabel,
          status: "booked",
        })
        .select("id")
        .single();
      if (vErr || !visit) throw new Error("Could not create visit");
      visitId = visit.id;
      await a.from("child_doses").insert(
        first.doses.map((code) => ({
          child_id: child.id,
          code,
          status: "booked" as const,
          due_date: data.slotDate,
          visit_id: visit.id,
        })),
      );
    }

    // remaining planned doses
    const plannedRows = plan.slice(1).flatMap((v: PlannedVisit) =>
      v.doses.map((code) => ({
        child_id: child.id,
        code,
        status: "planned" as const,
        due_date: v.date,
      })),
    );
    if (plannedRows.length > 0) await a.from("child_doses").insert(plannedRows);

    // open the WhatsApp thread: booking confirmation (the reminder sweep sends the day-before reminder)
    if (visitId) {
      const when = new Date(data.slotDate + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
      const whenHi = new Date(data.slotDate + "T00:00:00Z").toLocaleDateString("hi-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
      await a.from("messages").insert({
        guardian_id: guardianId, direction: "out", kind: "booking_confirm", status: "sent", sent_at: new Date().toISOString(), visit_id: visitId,
        body_en: `You're booked! ${data.childName}'s vaccines: ${when}, ${data.slotLabel}. We'll remind you the day before. Reply here anytime — e.g. if your child is unwell.`,
        body_hi: `बुकिंग पक्की! ${data.childName} के टीके: ${whenHi}, ${data.slotLabel}। एक दिन पहले याद दिलाएंगे। बच्चा बीमार हो तो यहीं लिखें।`,
        quick_replies: ["OK 👍", "Change date / तारीख बदलें"],
      });
    }

    return { token, visitId };
  });

// ---------- child timeline page ----------

export const getChildByToken = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().min(3).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: child } = await a
      .from("children")
      .select("id, name, dob, sex")
      .eq("public_token", data.token)
      .maybeSingle();
    if (!child) return null;

    const [{ data: doses }, { data: visits }, { data: cat }, { data: settings }] =
      await Promise.all([
        a.from("child_doses").select("*").eq("child_id", child.id).order("due_date"),
        a.from("visits").select("*").eq("child_id", child.id).order("day"),
        a.from("vaccine_doses").select("code, label_en, label_hi, rec_age_d"),
        a.from("clinic_settings").select("clinic_name, doctor_name, city, phone").eq("id", 1).single(),
      ]);

    return {
      child: { name: child.name, dob: child.dob, sex: child.sex },
      doses: ((doses ?? []) as { code: string; status: string; due_date: string | null; given_on: string | null; where_given: string | null; visit_id: string | null }[]).map((d) => ({
        code: d.code,
        status: d.status,
        dueDate: d.due_date,
        givenOn: d.given_on,
        whereGiven: d.where_given,
        visitId: d.visit_id,
      })),
      visits: ((visits ?? []) as { id: string; day: string; slot_label: string | null; status: string }[]).map((v) => ({
        id: v.id,
        day: v.day,
        slotLabel: v.slot_label,
        status: v.status,
      })),
      catalogue: Object.fromEntries(
        ((cat ?? []) as { code: string; label_en: string; label_hi: string }[]).map((c) => [c.code, { en: c.label_en, hi: c.label_hi }]),
      ),
      clinic: settings,
    };
  });

// ---------- bite course page ----------

export const getBiteCaseByToken = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().min(3).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: bc } = await a
      .from("bite_cases")
      .select("id, patient_name, category, animal, bitten_on, regimen, status")
      .eq("public_token", data.token)
      .maybeSingle();
    if (!bc) return null;

    const [{ data: doses }, { data: regimens }, { data: settings }] = await Promise.all([
      a.from("bite_doses").select("*").eq("bite_case_id", bc.id).order("day_offset"),
      a.from("rabies_regimens").select("code, label_en, label_hi, route"),
      a.from("clinic_settings").select("clinic_name, phone, city, bite_windows").eq("id", 1).single(),
    ]);
    const regimen = ((regimens ?? []) as { code: string; label_en: string; label_hi: string; route: string }[]).find((r) => r.code === bc.regimen);

    return {
      case: {
        patientName: bc.patient_name,
        category: bc.category,
        animal: bc.animal,
        bittenOn: bc.bitten_on,
        status: bc.status,
      },
      regimen: regimen
        ? { code: regimen.code, labelEn: regimen.label_en, labelHi: regimen.label_hi, route: regimen.route }
        : null,
      doses: ((doses ?? []) as { day_offset: number; due_date: string | null; status: string; given_at: string | null }[]).map((d) => ({
        offset: d.day_offset,
        dueDate: d.due_date,
        status: d.status,
        givenAt: d.given_at,
      })),
      clinic: settings,
    };
  });
