create type public.app_role as enum ('doctor','desk');
create type public.dose_status as enum ('planned','booked','given','given_elsewhere','skipped');
create type public.visit_status as enum ('planned','booked','confirmed','checked_in','done','missed','cancelled');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "staff read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.clinic_settings (id int primary key default 1 check (id=1),
  clinic_name text default 'Nanhe Kadam Child Clinic', doctor_name text default 'Dr. Meera Joshi',
  city text default 'Vijay Nagar, Indore', phone text default '+91 98260 12345',
  opd_hours jsonb not null, bite_windows jsonb not null,
  holidays date[] default '{}',
  rota_brand text default 'RV5', hepa_type text default 'inactivated',
  rabies_default_regimen text default 'ID_UTRC',
  id_sites_per_vial int default 8, vial_life_hours int default 8,
  auto_approve_bite_rebook boolean default false,
  mins_per_recall_call int default 4, mins_per_manual_replan int default 10);

create table public.vaccine_doses (code text primary key, label_en text, label_hi text, series text,
  rec_age_d int, min_age_d int, min_gap_prev_d int, is_live boolean default false,
  sort int, stock_sku text, notes text);

create table public.rabies_regimens (code text primary key, label_en text, label_hi text,
  day_offsets int[] not null, route text, rig_for_cat3 boolean);

create table public.guardians (id uuid primary key default gen_random_uuid(),
  name text, phone text unique not null, lang text default 'hi', created_at timestamptz default now());

create table public.children (id uuid primary key default gen_random_uuid(),
  guardian_id uuid references public.guardians, name text not null, dob date not null, sex text,
  public_token text unique not null, created_at timestamptz default now());

create table public.child_doses (id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children on delete cascade, code text references public.vaccine_doses,
  status dose_status not null default 'planned', due_date date, visit_id uuid,
  given_on date, batch_no text, where_given text, unique(child_id, code));

create table public.visits (id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('vaccine','bite')),
  child_id uuid references public.children, bite_case_id uuid,
  starts_at timestamptz, day date not null, slot_label text,
  status visit_status not null default 'planned', checked_in_at timestamptz,
  created_at timestamptz default now());

create table public.bite_cases (id uuid primary key default gen_random_uuid(),
  patient_name text not null, age_years int, guardian_id uuid references public.guardians,
  category int check (category in (1,2,3)), animal text, bitten_on date not null,
  previously_vaccinated boolean default false, regimen text references public.rabies_regimens,
  rig_given boolean, status text default 'active',
  public_token text unique not null, created_at timestamptz default now());

create table public.bite_doses (id uuid primary key default gen_random_uuid(),
  bite_case_id uuid references public.bite_cases on delete cascade, day_offset int, due_date date,
  visit_id uuid references public.visits, status dose_status default 'booked', given_at timestamptz,
  vial_id uuid);

create table public.vials (id uuid primary key default gen_random_uuid(),
  opened_at timestamptz not null, expires_at timestamptz not null,
  sites_total int not null, sites_used int default 0, batch_no text);

create table public.plan_changes (id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children, bite_case_id uuid references public.bite_cases,
  reason text, source_message_id uuid, diff jsonb not null, status text default 'pending',
  decided_at timestamptz, created_at timestamptz default now());

create table public.messages (id uuid primary key default gen_random_uuid(),
  guardian_id uuid references public.guardians, direction text check (direction in ('out','in')),
  kind text, body_en text, body_hi text, quick_replies jsonb, parsed jsonb,
  visit_id uuid, scheduled_for timestamptz, sent_at timestamptz, status text default 'scheduled',
  created_at timestamptz default now());

create table public.stock (sku text primary key, name text, on_hand int, reorder_level int);
create table public.app_clock (id int primary key default 1 check (id=1), demo_now timestamptz);
create table public.impact_events (id uuid primary key default gen_random_uuid(),
  kind text, minutes_saved int default 0, created_at timestamptz default now());

grant select, insert, update, delete on public.clinic_settings, public.vaccine_doses, public.rabies_regimens,
  public.guardians, public.children, public.child_doses, public.visits, public.bite_cases,
  public.bite_doses, public.vials, public.plan_changes, public.messages, public.stock,
  public.app_clock, public.impact_events to authenticated;
grant all on public.clinic_settings, public.vaccine_doses, public.rabies_regimens,
  public.guardians, public.children, public.child_doses, public.visits, public.bite_cases,
  public.bite_doses, public.vials, public.plan_changes, public.messages, public.stock,
  public.app_clock, public.impact_events to service_role;

alter table public.clinic_settings enable row level security;
alter table public.vaccine_doses enable row level security;
alter table public.rabies_regimens enable row level security;
alter table public.guardians enable row level security;
alter table public.children enable row level security;
alter table public.child_doses enable row level security;
alter table public.visits enable row level security;
alter table public.bite_cases enable row level security;
alter table public.bite_doses enable row level security;
alter table public.vials enable row level security;
alter table public.plan_changes enable row level security;
alter table public.messages enable row level security;
alter table public.stock enable row level security;
alter table public.app_clock enable row level security;
alter table public.impact_events enable row level security;

create policy "staff full access" on public.clinic_settings for all to authenticated using (true) with check (true);
create policy "staff full access" on public.vaccine_doses for all to authenticated using (true) with check (true);
create policy "staff full access" on public.rabies_regimens for all to authenticated using (true) with check (true);
create policy "staff full access" on public.guardians for all to authenticated using (true) with check (true);
create policy "staff full access" on public.children for all to authenticated using (true) with check (true);
create policy "staff full access" on public.child_doses for all to authenticated using (true) with check (true);
create policy "staff full access" on public.visits for all to authenticated using (true) with check (true);
create policy "staff full access" on public.bite_cases for all to authenticated using (true) with check (true);
create policy "staff full access" on public.bite_doses for all to authenticated using (true) with check (true);
create policy "staff full access" on public.vials for all to authenticated using (true) with check (true);
create policy "staff read and draft" on public.plan_changes for select to authenticated using (true);
create policy "staff insert drafts" on public.plan_changes for insert to authenticated with check (true);
create policy "doctor approves" on public.plan_changes for update to authenticated using (public.has_role(auth.uid(),'doctor')) with check (public.has_role(auth.uid(),'doctor'));
create policy "staff full access" on public.messages for all to authenticated using (true) with check (true);
create policy "staff full access" on public.stock for all to authenticated using (true) with check (true);
create policy "staff full access" on public.app_clock for all to authenticated using (true) with check (true);
create policy "staff full access" on public.impact_events for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.messages;

-- ===== Seed: clinic settings =====
insert into public.clinic_settings (id, opd_hours, bite_windows, holidays) values (1,
  '{"mon":[["10:00","13:00"],["17:30","20:30"]],"tue":[["10:00","13:00"],["17:30","20:30"]],"wed":[["10:00","13:00"],["17:30","20:30"]],"thu":[["10:00","13:00"],["17:30","20:30"]],"fri":[["10:00","13:00"],["17:30","20:30"]],"sat":[["10:00","13:00"],["17:30","20:30"]],"sun":[]}',
  '{"mon":[["10:00","10:45"],["17:30","18:00"]],"tue":[["10:00","10:45"],["17:30","18:00"]],"wed":[["10:00","10:45"],["17:30","18:00"]],"thu":[["10:00","10:45"],["17:30","18:00"]],"fri":[["10:00","10:45"],["17:30","18:00"]],"sat":[["10:00","10:45"],["17:30","18:00"]],"sun":[["10:00","11:00"]]}',
  array['2026-10-02','2026-10-20','2026-11-08']::date[]);
insert into public.app_clock (id, demo_now) values (1, null);

-- ===== Seed: vaccine catalogue (IAP-ACVIP 2023) =====
insert into public.vaccine_doses (code, label_en, label_hi, series, rec_age_d, min_age_d, min_gap_prev_d, is_live, sort, stock_sku) values
 ('BCG','BCG','बीसीजी','bcg',0,0,null,false,1,'BCG'),
 ('OPV0','OPV (birth)','ओपीवी (जन्म)','opv',0,0,null,false,2,'OPV'),
 ('HEPB1','Hepatitis B-1','हेपेटाइटिस बी-1','hepb',0,0,null,false,3,'HEPB'),
 ('DTP1','DTwP/DTaP-1','डीटीपी-1','dtp',42,42,null,false,10,'DTP'),
 ('IPV1','IPV-1','आईपीवी-1','ipv',42,42,null,false,11,'IPV'),
 ('HIB1','Hib-1','हिब-1','hib',42,42,null,false,12,'HIB'),
 ('HEPB2','Hepatitis B-2','हेपेटाइटिस बी-2','hepb',42,42,28,false,13,'HEPB'),
 ('ROTA1','Rotavirus-1','रोटावायरस-1','rota',42,42,null,false,14,'ROTA'),
 ('PCV1','PCV-1','पीसीवी-1','pcv',42,42,null,false,15,'PCV'),
 ('DTP2','DTwP/DTaP-2','डीटीपी-2','dtp',70,42,28,false,20,'DTP'),
 ('IPV2','IPV-2','आईपीवी-2','ipv',70,42,28,false,21,'IPV'),
 ('HIB2','Hib-2','हिब-2','hib',70,42,28,false,22,'HIB'),
 ('HEPB3','Hepatitis B-3','हेपेटाइटिस बी-3','hepb',70,42,28,false,23,'HEPB'),
 ('ROTA2','Rotavirus-2','रोटावायरस-2','rota',70,42,28,false,24,'ROTA'),
 ('PCV2','PCV-2','पीसीवी-2','pcv',70,42,28,false,25,'PCV'),
 ('DTP3','DTwP/DTaP-3','डीटीपी-3','dtp',98,42,28,false,30,'DTP'),
 ('IPV3','IPV-3','आईपीवी-3','ipv',98,42,28,false,31,'IPV'),
 ('HIB3','Hib-3','हिब-3','hib',98,42,28,false,32,'HIB'),
 ('HEPB4','Hepatitis B-4','हेपेटाइटिस बी-4','hepb',98,42,28,false,33,'HEPB'),
 ('ROTA3','Rotavirus-3','रोटावायरस-3','rota',98,42,28,false,34,'ROTA'),
 ('PCV3','PCV-3','पीसीवी-3','pcv',98,42,28,false,35,'PCV'),
 ('FLU1','Influenza-1','इन्फ्लूएंजा-1','flu',182,182,null,false,40,'FLU'),
 ('FLU2','Influenza-2','इन्फ्लूएंजा-2','flu',213,210,28,false,41,'FLU'),
 ('TCV','Typhoid conjugate','टाइफॉइड','tcv',274,182,null,false,42,'TCV'),
 ('MMR1','MMR-1','एमएमआर-1','mmr',274,274,null,true,43,'MMR'),
 ('HEPA1','Hepatitis A-1','हेपेटाइटिस ए-1','hepa',365,365,null,false,44,'HEPA'),
 ('MMR2','MMR-2','एमएमआर-2','mmr',456,456,28,true,45,'MMR'),
 ('VAR1','Varicella-1','वैरिसेला-1','var',456,365,null,true,46,'VAR'),
 ('PCVB','PCV booster','पीसीवी बूस्टर','pcv',456,365,56,false,47,'PCV'),
 ('DTPB1','DTwP/DTaP booster-1','डीटीपी बूस्टर-1','dtp',487,487,180,false,48,'DTP'),
 ('HIBB1','Hib booster-1','हिब बूस्टर-1','hib',487,365,56,false,49,'HIB'),
 ('IPVB1','IPV booster-1','आईपीवी बूस्टर-1','ipv',487,487,180,false,50,'IPV'),
 ('HEPA2','Hepatitis A-2','हेपेटाइटिस ए-2','hepa',548,548,180,false,51,'HEPA'),
 ('VAR2','Varicella-2','वैरिसेला-2','var',548,456,90,true,52,'VAR'),
 ('DTPB2','DTwP/DTaP booster-2','डीटीपी बूस्टर-2','dtp',1461,1461,180,false,53,'DTP'),
 ('IPVB2','IPV booster-2','आईपीवी बूस्टर-2','ipv',1461,1461,null,false,54,'IPV'),
 ('MMR3','MMR-3','एमएमआर-3','mmr',1461,1461,28,true,55,'MMR');

insert into public.rabies_regimens (code, label_en, label_hi, day_offsets, route, rig_for_cat3) values
 ('ID_UTRC','Intradermal (2-site), days 0-3-7-28','इंट्राडर्मल (2 जगह), दिन 0-3-7-28', array[0,3,7,28], 'ID', true),
 ('IM_ESSEN','Intramuscular (Essen), days 0-3-7-14-28','इंट्रामस्क्युलर (एसेन), दिन 0-3-7-14-28', array[0,3,7,14,28], 'IM', true),
 ('REEXPOSURE','Re-exposure (previously vaccinated), days 0-3','दोबारा एक्सपोज़र (पहले टीका लगा), दिन 0-3', array[0,3], 'IM', false);

insert into public.stock (sku, name, on_hand, reorder_level) values
 ('BCG','BCG',12,4),('OPV','OPV',20,6),('HEPB','Hepatitis B',9,4),('DTP','DTwP/DTaP',14,6),
 ('IPV','IPV',10,4),('HIB','Hib',8,4),('ROTA','Rotavirus',6,3),('PCV','PCV',5,3),
 ('FLU','Influenza',4,2),('TCV','Typhoid conjugate',5,2),('MMR','MMR',6,3),('RABIES','Anti-rabies (ID)',7,4);

-- ===== Seed: guardians, children, doses, visits =====
DO $$
DECLARE
  names text[] := array['Aarav','Anaya','Vihaan','Myra','Advait','Ira','Kabir','Saanvi','Arjun','Diya','Reyansh','Anika','Vivaan','Navya','Aditya','Kiara','Krishna','Aadhya','Shaurya','Pari','Rudra','Siya','Atharv','Zara','Dev','Meera','Yash','Riya','Om','Anvi','Laksh','Prisha','Veer','Ishita','Ayan','Sara','Kian','Tara','Nirvaan','Aisha'];
  surnames text[] := array['Sharma','Verma','Patel','Gupta','Joshi','Agrawal','Chouhan','Yadav','Meena','Kulkarni','Singh','Tiwari','Dubey','Rathore','Nair','Bose','Pillai','Das','Khan','Solanki'];
  g uuid; c uuid; i int; dob date; age_d int; tok text;
BEGIN
  FOR i IN 1..40 LOOP
    INSERT INTO public.guardians (name, phone, lang)
    VALUES (surnames[1 + (i % 20)] || ' family', '+9198' || lpad((10000000 + i * 13711)::text, 8, '0'), CASE WHEN i % 3 = 0 THEN 'en' ELSE 'hi' END)
    RETURNING id INTO g;
    dob := CURRENT_DATE - (20 + (i * 47) % 1900);
    age_d := CURRENT_DATE - dob;
    tok := 'c' || substr(md5(random()::text || i), 1, 10);
    INSERT INTO public.children (guardian_id, name, dob, sex, public_token)
    VALUES (g, names[i], dob, CASE WHEN i % 2 = 0 THEN 'F' ELSE 'M' END, tok)
    RETURNING id INTO c;
    INSERT INTO public.child_doses (child_id, code, status, due_date, given_on, where_given)
    SELECT c, vd.code,
      CASE
        WHEN vd.rec_age_d <= age_d AND random() < 0.92 THEN
          CASE WHEN random() < 0.18 THEN 'given_elsewhere'::dose_status ELSE 'given'::dose_status END
        WHEN vd.rec_age_d <= age_d THEN 'planned'::dose_status
        ELSE 'planned'::dose_status
      END,
      dob + vd.rec_age_d,
      CASE WHEN vd.rec_age_d <= age_d AND random() < 0.92 THEN dob + vd.rec_age_d + (random() * 5)::int END,
      CASE WHEN random() < 0.18 THEN 'govt' ELSE 'clinic' END
    FROM public.vaccine_doses vd;
  END LOOP;
END $$;

-- Hero child: Aarav, 8 weeks old, 6-week doses given, 10-week visit booked tomorrow
DO $$
DECLARE g uuid; c uuid; v uuid;
BEGIN
  INSERT INTO public.guardians (name, phone, lang) VALUES ('Priya Sharma', '+919826000001', 'hi') RETURNING id INTO g;
  INSERT INTO public.children (guardian_id, name, dob, sex, public_token)
  VALUES (g, 'Aarav', CURRENT_DATE - 56, 'M', 'demo-aarav') RETURNING id INTO c;
  UPDATE public.children SET dob = CURRENT_DATE - 56 WHERE id = c;
  INSERT INTO public.child_doses (child_id, code, status, due_date, given_on, where_given)
  SELECT c, vd.code,
    CASE WHEN vd.rec_age_d <= 42 THEN 'given'::dose_status ELSE 'planned'::dose_status END,
    (CURRENT_DATE - 56) + vd.rec_age_d,
    CASE WHEN vd.rec_age_d <= 42 THEN (CURRENT_DATE - 56) + vd.rec_age_d END,
    'clinic'
  FROM public.vaccine_doses vd;
  INSERT INTO public.visits (kind, child_id, day, slot_label, status)
  VALUES ('vaccine', c, CURRENT_DATE + 1, '10:15', 'booked') RETURNING id INTO v;
  UPDATE public.child_doses SET status = 'booked', visit_id = v
  WHERE child_id = c AND code IN ('DTP2','IPV2','HIB2','HEPB3','ROTA2','PCV2');
END $$;

-- ===== Seed: bite cases =====
DO $$
DECLARE
  g uuid; bc uuid; v uuid; vl uuid; i int;
  patients text[] := array['Rohan (12)','Sneha (8)','Imran (34)','Pooja (19)','Arif (27)','Lata (45)'];
  offsets int[];
BEGIN
  -- 1. day-0 today
  INSERT INTO public.guardians (name, phone) VALUES ('Rohan''s father', '+919826000101') RETURNING id INTO g;
  INSERT INTO public.bite_cases (patient_name, age_years, guardian_id, category, animal, bitten_on, regimen, rig_given, public_token)
  VALUES ('Rohan', 12, g, 3, 'dog', CURRENT_DATE, 'ID_UTRC', true, 'demo-bite-rohan') RETURNING id INTO bc;
  INSERT INTO public.visits (kind, bite_case_id, day, slot_label, status, checked_in_at)
  VALUES ('bite', bc, CURRENT_DATE, 'Walk-in', 'checked_in', now()) RETURNING id INTO v;
  INSERT INTO public.bite_doses (bite_case_id, day_offset, due_date, visit_id, status)
  VALUES (bc, 0, CURRENT_DATE, v, 'booked'),
         (bc, 3, CURRENT_DATE + 3, null, 'booked'),
         (bc, 7, CURRENT_DATE + 7, null, 'booked'),
         (bc, 28, CURRENT_DATE + 28, null, 'booked');
  -- 2. due day-7 today (evening window)
  INSERT INTO public.guardians (name, phone) VALUES ('Sneha''s mother', '+919826000102') RETURNING id INTO g;
  INSERT INTO public.bite_cases (patient_name, age_years, guardian_id, category, animal, bitten_on, regimen, public_token)
  VALUES ('Sneha', 8, g, 2, 'dog', CURRENT_DATE - 7, 'ID_UTRC', 'demo-bite-sneha') RETURNING id INTO bc;
  INSERT INTO public.visits (kind, bite_case_id, day, slot_label, status)
  VALUES ('bite', bc, CURRENT_DATE, '17:30', 'booked') RETURNING id INTO v;
  INSERT INTO public.bite_doses (bite_case_id, day_offset, due_date, visit_id, status, given_at)
  VALUES (bc, 0, CURRENT_DATE - 7, null, 'given', now() - interval '7 days'),
         (bc, 3, CURRENT_DATE - 4, null, 'given', now() - interval '4 days'),
         (bc, 7, CURRENT_DATE, v, 'booked', null),
         (bc, 28, CURRENT_DATE + 21, null, 'booked', null);
  -- 3. MISSED day-7 yesterday (watchdog demo)
  INSERT INTO public.guardians (name, phone) VALUES ('Imran', '+919826000103') RETURNING id INTO g;
  INSERT INTO public.bite_cases (patient_name, age_years, guardian_id, category, animal, bitten_on, regimen, public_token)
  VALUES ('Imran', 34, g, 3, 'dog', CURRENT_DATE - 8, 'ID_UTRC', 'demo-bite-imran') RETURNING id INTO bc;
  INSERT INTO public.visits (kind, bite_case_id, day, slot_label, status)
  VALUES ('bite', bc, CURRENT_DATE - 1, '17:30', 'missed') RETURNING id INTO v;
  INSERT INTO public.bite_doses (bite_case_id, day_offset, due_date, visit_id, status, given_at)
  VALUES (bc, 0, CURRENT_DATE - 8, null, 'given', now() - interval '8 days'),
         (bc, 3, CURRENT_DATE - 5, null, 'given', now() - interval '5 days'),
         (bc, 7, CURRENT_DATE - 1, v, 'planned', null),
         (bc, 28, CURRENT_DATE + 20, null, 'planned', null);
  -- 4. completed course
  INSERT INTO public.guardians (name, phone) VALUES ('Pooja', '+919826000104') RETURNING id INTO g;
  INSERT INTO public.bite_cases (patient_name, age_years, guardian_id, category, animal, bitten_on, regimen, status, public_token)
  VALUES ('Pooja', 19, g, 2, 'cat', CURRENT_DATE - 30, 'ID_UTRC', 'completed', 'demo-bite-pooja') RETURNING id INTO bc;
  INSERT INTO public.bite_doses (bite_case_id, day_offset, due_date, status, given_at)
  VALUES (bc, 0, CURRENT_DATE - 30, 'given', now() - interval '30 days'),
         (bc, 3, CURRENT_DATE - 27, 'given', now() - interval '27 days'),
         (bc, 7, CURRENT_DATE - 23, 'given', now() - interval '23 days'),
         (bc, 28, CURRENT_DATE - 2, 'given', now() - interval '2 days');
  -- 5 & 6. mid-course
  FOR i IN 5..6 LOOP
    INSERT INTO public.guardians (name, phone) VALUES (patients[i] || ' contact', '+9198260001' || lpad(i::text,2,'0')) RETURNING id INTO g;
    INSERT INTO public.bite_cases (patient_name, age_years, guardian_id, category, animal, bitten_on, regimen, public_token)
    VALUES (split_part(patients[i],' ',1), (regexp_replace(patients[i], '\D', '', 'g'))::int, g, 2, 'dog', CURRENT_DATE - (i + 1), 'ID_UTRC', 'demo-bite-' || i) RETURNING id INTO bc;
    INSERT INTO public.bite_doses (bite_case_id, day_offset, due_date, status)
    SELECT bc, off, CURRENT_DATE - (i + 1) + off,
      CASE WHEN CURRENT_DATE - (i + 1) + off < CURRENT_DATE THEN 'given'::dose_status ELSE 'booked'::dose_status END
    FROM unnest(array[0,3,7,28]) AS off;
  END LOOP;
  -- open vial from this morning
  INSERT INTO public.vials (opened_at, expires_at, sites_total, sites_used, batch_no)
  VALUES (date_trunc('day', now()) + interval '10 hours', date_trunc('day', now()) + interval '18 hours', 8, 2, 'RV-2026-114') RETURNING id INTO vl;
END $$;

-- ===== Seed: message history (~60) =====
INSERT INTO public.messages (guardian_id, direction, kind, body_en, body_hi, sent_at, status)
SELECT g.id,
  CASE WHEN s.n % 3 = 0 THEN 'in' ELSE 'out' END,
  CASE WHEN s.n % 4 = 0 THEN 'reminder_1d' WHEN s.n % 4 = 1 THEN 'reminder_3d' WHEN s.n % 4 = 2 THEN 'booking_confirmed' ELSE 'free_text' END,
  'Reminder: your child''s vaccine visit is coming up at Nanhe Kadam Clinic.',
  'याददाश्त: आपके बच्चे की टीका विज़िट नन्हे कदम क्लिनिक में आ रही है।',
  now() - (s.n || ' hours')::interval,
  'sent'
FROM public.guardians g CROSS JOIN generate_series(1, 2) s(n)
LIMIT 60;

-- ===== Seed: impact events (past 4 weeks) =====
INSERT INTO public.impact_events (kind, minutes_saved, created_at)
SELECT kinds.kind, kinds.mins, now() - (s.n || ' days')::interval
FROM generate_series(0, 27) s(n)
CROSS JOIN (VALUES
  ('recall_call_avoided', 4), ('recall_call_avoided', 4),
  ('replan_automated', 10), ('vial_dose_saved', 0)
) AS kinds(kind, mins)
WHERE random() < 0.75;
INSERT INTO public.impact_events (kind, minutes_saved, created_at)
VALUES ('bite_course_completed', 0, now() - interval '2 days');