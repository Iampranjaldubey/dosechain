/** Server-only loader for the Child Health Passport. Caller must have validated access. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export async function childByToken(a: Db, token: string) {
  const { data } = await a.from("children").select("id, name, dob, sex, clinic_id, guardian_id, public_token").eq("public_token", token).maybeSingle();
  return data as null | { id: string; name: string; dob: string; sex: string | null; clinic_id: string; guardian_id: string | null; public_token: string };
}

export async function loadPassport(a: Db, child: { id: string; name: string; dob: string; sex: string | null; clinic_id: string }, opts: { includeShares: boolean }) {
  const [prof, visits, growth, ms, docs, doses, cat, settings, shares] = await Promise.all([
    a.from("health_profile").select("*").eq("child_id", child.id).maybeSingle(),
    a.from("health_visits").select("*, prescriptions(*)").eq("child_id", child.id).order("visit_date", { ascending: false }),
    a.from("growth_readings").select("*").eq("child_id", child.id).order("measured_on"),
    a.from("milestones").select("code, achieved_on").eq("child_id", child.id),
    a.from("health_documents").select("*").eq("child_id", child.id).order("doc_date", { ascending: false }),
    a.from("child_doses").select("code, status, due_date, given_on, where_given, batch_no").eq("child_id", child.id).order("due_date"),
    a.from("vaccine_doses").select("code, label_en, label_hi, sort").order("sort"),
    a.from("clinic_settings").select("clinic_name, doctor_name, city, phone").eq("clinic_id", child.clinic_id).maybeSingle(),
    opts.includeShares
      ? a.from("share_links").select("id, expires_at, revoked_at, created_at, token, share_views(viewed_at, viewer)").eq("child_id", child.id).order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const docRows = (docs.data ?? []) as any[];
  const signed = await Promise.all(
    docRows.map(async (d) => {
      const { data } = await a.storage.from("health-docs").createSignedUrl(d.file_path, 600);
      return { id: d.id, kind: d.kind, title: d.title, docDate: d.doc_date, source: d.source, url: data?.signedUrl ?? null };
    }),
  );

  const today = new Date().toISOString().slice(0, 10);
  const doseRows = (doses.data ?? []) as any[];
  const overdue = doseRows.filter((d) => (d.status === "planned" || d.status === "booked") && d.due_date && d.due_date < today).length;
  const p = prof.data as any;

  return {
    child: { name: child.name, dob: child.dob, sex: child.sex },
    profile: {
      bloodGroup: p?.blood_group ?? null,
      allergies: (p?.allergies ?? []) as string[],
      conditions: (p?.conditions ?? []) as string[],
      birthWeightKg: p?.birth_weight_kg ?? null,
      notes: p?.notes ?? null,
    },
    visits: ((visits.data ?? []) as any[]).map((v) => ({
      id: v.id, date: v.visit_date, doctor: v.doctor_name, clinic: v.clinic_name, symptoms: v.symptoms, diagnosis: v.diagnosis,
      advice: v.advice, followUpOn: v.follow_up_on, isIllness: v.is_illness, source: v.source as "clinic" | "parent",
      rx: ((v.prescriptions ?? []) as any[]).map((r) => ({ medicine: r.medicine, dose: r.dose, frequency: r.frequency, days: r.days })),
    })),
    growth: ((growth.data ?? []) as any[]).map((g) => ({ id: g.id, on: g.measured_on, weight: g.weight_kg ? Number(g.weight_kg) : null, height: g.height_cm ? Number(g.height_cm) : null, head: g.head_cm ? Number(g.head_cm) : null, source: g.source })),
    milestones: Object.fromEntries(((ms.data ?? []) as any[]).map((m) => [m.code, m.achieved_on])) as Record<string, string>,
    documents: signed,
    vaccines: {
      overdue,
      given: doseRows.filter((d) => d.status === "given" || d.status === "given_elsewhere").length,
      total: doseRows.length,
      rows: doseRows.map((d) => ({ code: d.code, status: d.status, dueDate: d.due_date, givenOn: d.given_on, where: d.where_given, batch: d.batch_no })),
      labels: Object.fromEntries(((cat.data ?? []) as any[]).map((c) => [c.code, { en: c.label_en, hi: c.label_hi }])) as Record<string, { en: string; hi: string }>,
    },
    clinic: settings.data as null | { clinic_name: string; doctor_name: string; city: string; phone: string },
    shares: ((shares.data ?? []) as any[]).map((s) => ({
      id: s.id, token: s.token, expiresAt: s.expires_at, revokedAt: s.revoked_at, createdAt: s.created_at,
      views: ((s.share_views ?? []) as any[]).map((v) => ({ at: v.viewed_at, viewer: v.viewer })),
    })),
  };
}

export type Passport = Awaited<ReturnType<typeof loadPassport>>;
