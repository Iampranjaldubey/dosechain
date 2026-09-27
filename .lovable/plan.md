# Child Health Passport

One portable profile per child that holds every vaccine, visit, prescription, allergy, growth reading and report. A parent who moves city shows a QR code, and the new doctor sees the child's full history. No paper files needed.

## What parents see (child page, new "Health Passport" tabs)

1. **Summary card at the top**: name, age, blood group, and red warning chips for allergies and ongoing conditions. Also shows vaccine status ("Up to date" or "2 overdue").
2. **Vaccines**: the existing timeline and certificates.
3. **Visits & prescriptions**: each visit shows the date, clinic, doctor, symptoms, diagnosis, medicines (name, dose, how often, how many days) and advice. Entries a parent adds are marked "Added by parent". Clinic entries are marked "Verified by clinic".
4. **Growth**: weight, height and head size plotted on WHO child growth curves. A soft alert appears if a reading drops by more than 2 percentile lines. There is also a checklist of milestones (smiles, sits, walks, first words).
5. **Reports**: upload photos or PDFs of lab reports, discharge papers or old cards, each with a type and date.
6. **Share with a doctor**: this creates a QR code and link.
   - Read-only view that expires after 24 hours (the parent can also choose 1 hour or 7 days). It works for any doctor, with no login.
   - For clinics on DoseChain, staff scan the same QR and choose "Add to my clinic". The child and full history are copied into their clinic, and the original clinic's entries stay marked with their source.
   - The parent can see who opened the link and when, and can revoke it at any time.

## What clinic staff get

- A "Record visit" form on the child page: symptoms, diagnosis, medicines, advice, next follow-up, plus weight and height. It saves to the passport and adds any follow-up as a booking.
- Allergy check: when staff add a medicine that matches a recorded allergy, a warning appears before saving.
- A one-page "Doctor summary" that can be printed or saved as PDF: allergies, conditions, current medicines, recent visits, growth trend and vaccine gaps.

## Additional valuable features (from research)

- **Illness-aware vaccine replanning**: when a visit records fever or illness, the existing replanning engine suggests a new vaccine date for the doctor to approve.
- **Medicine reminders**: prescriptions can send WhatsApp reminders to the parent ("Paracetamol 5 ml at 8 PM") for the course length.
- **Plain-language summary in Hindi and English**: AI turns a visit note into a short explanation for parents. It uses a simple template if AI is unavailable.
- **Card and report reading**: the existing card-photo reader is extended to fill report dates and types automatically.
- **Consent and privacy**: nothing is shared without a parent-created link. Every link is logged, and all links expire.

## Out of scope

- Links to India's national digital health ID system (possible later).
- Doctors outside DoseChain editing records.

## Technical details

- New tables (clinic-scoped, RLS via is_staff_of, with GRANTs):
  - `health_profile` (child_id, blood_group, allergies jsonb, conditions jsonb, birth_weight, notes)
  - `health_visits` (child_id, visit_date, doctor_name, clinic_name, symptoms, diagnosis, advice, follow_up_on, source 'clinic' or 'parent')
  - `prescriptions` (health_visit_id, medicine, dose, frequency, days, remind bool)
  - `growth_readings` (child_id, measured_on, weight_kg, height_cm, head_cm, source)
  - `milestones` (child_id, code, achieved_on)
  - `health_documents` (child_id, kind, doc_date, file_path, source)
  - `share_links` (child_id, token, expires_at, revoked_at, created_at) and `share_views` (link_id, viewed_at, clinic_id)
- A private storage bucket for reports, served through short-lived signed links only.
- Parent access works through the existing child token in token-validated server functions, following the same pattern as getChildByToken. Staff access uses requireSupabaseAuth.
- New route `/p/$shareToken` shows a public read-only passport. It checks that the link has not expired or been revoked and logs each view. It has noindex and no OG image.
- "Add to my clinic" is a SECURITY DEFINER function that copies the child and its history into the caller's clinic after checking the share link and staff role.
- WHO growth reference tables (0–5 years) are bundled as static data. Percentile maths goes in a pure TS module with vitest tests.
- Medicine reminders reuse the existing messages and reminder sweep in followup.server.ts.
- Staff inputs are validated with zod. Uploads are limited to 10 MB and to images or PDFs.
