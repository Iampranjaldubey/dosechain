import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Footprint";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo stage — DoseChain" },
      { name: "description", content: "Walk through DoseChain in three minutes: booking, fever reshuffle with doctor approval, and the rabies bite rescue." },
      { property: "og:title", content: "Demo stage — DoseChain" },
      { property: "og:description", content: "Parent phone and clinic desk side by side — the whole story in one take." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Demo,
});

const STEPS = [
  { title: "Book once, plan for years", body: "Open the booking flow and enter a baby's date of birth — DoseChain plans the whole series.", link: "/book", label: "Open booking" },
  { title: "Reminder goes out", body: "On the clinic desk press “Run reminders & watchdog”. Aarav's parent gets tomorrow's reminder in the phone on the right.", link: "/clinic", label: "Open clinic desk" },
  { title: "“Bachhe ko bukhar hai”", body: "In the phone, tap “Fever / बुखार है” or type in Hindi. AI reads it and proposes a safe new date.", link: null, label: "" },
  { title: "Doctor confirms", body: "The doctor sees the whole reshuffled chain with every interval checked, and approves in one tap.", link: "/clinic/approvals", label: "Open approvals" },
  { title: "Missed rabies dose rescued", body: "Imran missed his day-7 dose. The watchdog messages him and shifts later doses, keeping the gaps.", link: "/wa/demo-bite-imran", label: "Imran's chat" },
  { title: "Time saved", body: "The impact card on the desk counts recall calls and manual re-plans the clinic no longer does.", link: "/clinic", label: "See impact" },
] as const;

function Demo() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/"><Logo /></Link>
          <span className="text-sm text-muted-foreground">Demo stage</span>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_400px]">
        <section>
          <h1 className="font-display text-4xl sm:text-5xl">The whole story, in one take</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">Keep the clinic desk open in another tab, signed in as the doctor. Follow the steps; the parent phone updates live.</p>
          <ol className="mt-8 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary">{s.label} →</a>}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-center text-sm font-semibold text-muted-foreground">Aarav's parent · phone</p>
          <div className="overflow-hidden rounded-[2.5rem] border-[10px] border-foreground shadow-2xl">
            <iframe title="Parent phone" src="/wa/demo-aarav" className="h-[720px] w-full bg-background" />
          </div>
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <a href="/c/demo-aarav" target="_blank" rel="noreferrer" className="text-primary">Aarav's plan</a>
            <a href="/b/demo-bite-imran" target="_blank" rel="noreferrer" className="text-primary">Imran's bite course</a>
          </div>
        </aside>
      </main>
    </div>
  );
}
