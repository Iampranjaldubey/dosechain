# DoseChain — build plan (Nanhe Kadam Child Clinic)

## What the documents describe

A fictional solo pediatric clinic in Indore. The app turns one booking into a whole plan:

- Parent adds a child (name, birth date, doses already given) and the app plans every vaccine visit from birth to age 6, books the next one and keeps the rest as a plan.
- A simulated WhatsApp chat sends confirmations and reminders with one-tap replies: Confirm, Change time, Baby is unwell.
- "Baby has fever" (in Hindi, Hinglish or English) drafts a new plan; the doctor approves with one tap and every later visit shifts safely.
- A dog-bite lane: the whole rabies course is booked on day 0, follow-ups land in shared-vial windows, and a missed dose triggers a nudge plus a rebooking draft.
- A clinic side: Today, Approvals, Recall list, bite cases, messages, settings, and an impact card (calls avoided, re-plans automated, vial doses saved, course completion).
- English / हिंदी toggle everywhere, plus a demo screen with a fake clock so the video can be recorded in one take.

The project folder is currently the empty starter, so everything below is new work.

## Assessment

Strong, differentiated entry: real stakes, a memorable signature moment (fever reshuffles the whole chain), and a second one (shared-vial bite windows) that no competitor has. The main risks are scope and time, not the idea.

Things the documents get wrong or leave open, which this plan corrects:

1. **The documents assume a different technical setup than this project has.** The plan below maps every "edge function" to what this project actually uses. No feature is lost; some plumbing differs.
2. **Scheduled background jobs** (the 15-minute reminder/watchdog runner) are the most fragile part for a demo. Plan: the demo clock plus a visible "Run now" button is the primary path; the timed schedule is a bonus.
3. **Staff logins add friction for judges.** Plan: the clinic side is reachable in demo mode without a login, with accounts optional.
4. **Hindi copy** must be written by a person; no machine-translated medical wording.

## Build order

**Step 1 — Foundation.** Turn on the backend, create the design system (teal/saffron/coral/cream, footprint timeline, Plus Jakarta Sans + Noto Sans Devanagari), app shell and language toggle.

**Step 2 — Data.** All tables from the spec with access rules, the vaccine catalogue, the three rabies courses, clinic settings, and seed data (≈40 children, hero child Aarav, 6 bite cases including one missed day 7, an open vial, message history, impact events). Seed rows go in the migration so the shared/remix link always opens with data.

**Step 3 — The engines, tested first.** Two pure calculation modules with automated tests before any screen: the dose-chain planner (minimum ages, gaps, live-vaccine rule, visit grouping, clinic-hours snapping) and the bite-course planner (day offsets, windows, resume-never-restart). All eight test cases from the spec must pass.

**Step 4 — Parent front door.** Landing page with the 57% hook and sources, the 5-step booking flow, the footprint timeline, the child page, and the bite-course page.

**Step 5 — Follow-through.** Simulated WhatsApp screen, message templates in both languages, the automation runner with a "Run now" button and demo clock, AI reply parsing, and the approvals screen with the animated before/after timeline.

**Step 6 — Clinic + bite lane.** Triage and course creation, vials and the missed-dose watchdog, Today, recall list, child profile, messages log, settings with sources, impact card.

**Step 7 — Demo stage and polish.** Split-screen demo page with clock controls and reset, loading/empty/error states everywhere, a full pass over Hindi and English copy, acceptance checks, publish.

Cut order if time runs short: stock view, vaccination-card QR, recall sorting, IM regimen, timed schedule. Never cut: series booking, fever reshuffle + approval, bite course + rescue, language toggle, demo stage.

## Technical notes

- Stack here is TanStack Start (React 19 + Vite 7 + Tailwind v4) with Lovable Cloud (Postgres + Auth). Server logic uses server functions, not Supabase edge functions; the spec's `plan-child`, `book-visit`, `inbound-message`, `approve-change`, `open-bite-case`, `record-dose`, `run-automations`, `demo-reset` each become a server function of the same name and contract.
- `run-automations` is exposed additionally as a public endpoint under `/api/public/` so a scheduled caller can hit it; a shared-secret header guards it.
- Parent token routes (`/c/:token`, `/b/:token`, `/wa/:token`) are public and read through narrow server-side reads returning only that child's or case's rows; parents never sign in. Staff routes live under the protected layout.
- `src/lib/dosechain.ts` and `src/lib/bitelane.ts` stay pure TypeScript with Vitest coverage and no database calls, so dates stay verifiable.
- Reply parsing uses the Lovable AI gateway with a strict tool schema returning intent, symptoms, preferred date, part of day and language.
- Every table gets row-level security plus explicit grants; only the doctor role may approve plan changes.
- Demo clock: an `app_clock` row overrides "now" for all scheduling reads when demo mode is on.
- Seeded demo data ships inside the migration so the published and remixed links work with no secrets.
