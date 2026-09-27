<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Clinic logic lives in src/lib/followup.server.ts (sweep, watchdog, reply handling, apply change); clinic.functions.ts (auth) and wa.functions.ts (token) are thin wrappers — one core, two entry points.
- Parent reply parsing falls back to keyword rules when AI is unavailable — the remix must work with zero secrets.
- First staff account claims the doctor role (claim_doctor_if_none); later accounts are desk.
