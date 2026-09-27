# DoseChain — winning features (research-backed)

## Why these
- Coverage drops from 94.6% at birth to 67.5% by 14 weeks — the exact window DoseChain manages.
- Judges of Lovable/Contra challenges reward visible AI doing real work, a specific local problem, polish and a tight before/after story.
- Competitors (Practo Ray, Eka Care) are record-keeping tools for the doctor. None offers Hinglish WhatsApp understanding, fever re-planning or rabies vial logic. U-WIN (the government system) made QR certificates the norm, so ours will look familiar.

## Features to build (ranked by wow per effort)

1. **Photo of a paper vaccine card → full plan.** Parent snaps the card in the booking flow; AI reads the doses and dates, the parent checks them, and the full catch-up plan appears. This is the strongest before/after moment.
2. **Hindi voice notes.** A mic button in the parent chat: a voice note like "bachhe ko bukhar hai" is transcribed and handled like a typed reply (re-plan, then doctor approval).
3. **Spoken reminders.** A play button on reminder messages reads them aloud in Hindi, for grandparents who can't read.
4. **QR vaccination certificate.** A printable certificate page for each child with the doctor's name, every dose given and a QR code that opens a public check page. Useful for school admission.
5. **Doctor's morning briefing + no-show risk.** A clear rule-based risk score (overdue days, past no-shows, bite category, unanswered reminders) with the reasons shown. The top of the desk shows an AI-written summary like "12 today, 2 urgent bites, 3 likely no-shows — reminders sent", with a "Nudge all high-risk" button.
6. **Family view + UPI pay-and-confirm.** One link shows all of a parent's children, with "come together" suggestions. Reminders include a (mock) UPI pay button; paying confirms the visit live on the desk.
7. **Hesitancy reply helper.** When a parent asks "side effect hoga kya?", AI drafts a calm reply in Hinglish, based on IAP guidance, for the doctor to approve and send.

Polish: loading, empty and error screens everywhere; tick marks on chat bubbles; the demo page updated to a 2-minute story that opens on "a missed rabies dose can kill".

## Build approach
Build in parallel tracks, each checked with the browser before moving on:
- Track A (AI input): card reading (1), voice notes (2), spoken reminders (3)
- Track B (trust): certificate + check page (4), family view (6)
- Track C (clinic brain): risk score + briefing (5), hesitancy helper (7), UPI mock (6)

## Technical details
- Card reading: vision model through AI Gateway; reply as JSON matching dose codes; parent confirms before saving (the app suggests, a person confirms).
- Voice: record with MediaRecorder, send to a server function, transcribe with `google/gemini-3.5-transcribe`, then reuse the existing reply handler. Spoken reminders use `google/gemini-3.1-flash-tts-preview`, saved to storage and cached on the message.
- Certificate: `/cert/$token` page with print styles and a QR image generated in the browser; `/verify/$token` is public and shows no personal details beyond first name and doses.
- Risk: pure TypeScript function with tests; the briefing streams from `openai/gpt-6-astra`.
- New columns: `messages.audio_url` and `visits.paid_at`, plus a small `payments` log. Every AI call still works without AI (plain text fallbacks) so the public remix keeps working.
