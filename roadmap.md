# DoseChain roadmap

- [x] 1. Foundation: enable Lovable Cloud, design system (teal/saffron/coral/cream, footprints, Plus Jakarta Sans + Noto Sans Devanagari), app shell, EN/HI toggle
- [x] 2. Data: schema + RLS + grants, vaccine catalogue, rabies regimens, clinic settings, seed data in migration
- [x] 3. Engines: src/lib/dosechain.ts + bitelane.ts, pure TS, Vitest (8 spec cases)
- [x] 4. Parent front door: landing /, /book flow, /c/:token, /b/:token
- [x] 5. Follow-through: /wa/:token WhatsApp sim, templates EN/HI, run-automations + demo clock, AI parse-reply, /clinic/approvals
- [x] 6. Clinic + bite lane: triage, vials, watchdog, Today, recall, child profile, messages, settings, impact card
- [x] 7. Demo stage /demo + polish
- [ ] Publish (user action) · Partner Program application (user) · real clinic phone number (needs user)
- [x] Theme decision: user wants to co-decide frontend theme (palette, fonts, layout energy) via questions before screens are built

## UX overhaul (user feedback Sep 27)
- [x] Landing page feels basic/generic — do UX engineering: real-website feel, richer sections, motion, hierarchy (keep locked Fresh Mint theme + fonts)

## Differentiation (user, Sep 27)
- [ ] Research + engineer high-value features that win the challenge (multi-agent research → plan → build)
- [ ] Enable email sign-up for staff (currently disabled — blocks clinic login + UAT)
- [x] Staff-only clinic: login required + real staff role check for /clinic and /clinic/capacity
- [x] Every booking creates a WhatsApp thread (confirmation message) + reminder sweep picks it up
- [x] Dashboard: Today, recall list, vials used, watchdog — real data

- [x] Reminder sweep: scheduled messages for every booked appointment, dashboard counts update
- [x] E2E: sign up, confirm booking on Today, check parent child timeline

## New requests (2026-09-27)
- [ ] Parent onboarding page: create first child, then walk booking wizard end to end
- [ ] Multi-clinic admin panel: staff roles so each clinic has its own dashboard and capacity data
- [ ] Multi-clinic wiring (in progress): clinic.functions/followup/parent.functions clinic-scoped; clinic-context + clinic.tsx membership UI (join/create); dashboard/approvals/capacity use active clinic; verify build + UAT
- [x] Hero: remove blob section, thick sticker border around hero image (user request)

- [x] Input validation sweep: phone numbers exactly 10 digits (Indian mobile), other length/format limits across all forms + server
- [x] Child Health Passport (in progress)
- [x] Hero image: revert to original thick rounded border
- [ ] Second clinic + desk account isolation check
- [x] Staff invite + approve form (Settings)
- [x] Staff "My clinics" view
- [ ] Redesign sparse pages (sign-in first): fill empty space with crafted layout, avoid generic AI patterns
