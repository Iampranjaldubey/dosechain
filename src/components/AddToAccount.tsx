import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { linkByToken } from "@/lib/family.functions";
import { useLang } from "@/lib/i18n";

/** On a child's private page: save this child into the parent's account. */
export function AddToAccount({ token }: { token: string }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const nav = useNavigate();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  if (signedIn === null) return null;
  if (!signedIn) {
    return (
      <Link to="/family" search={{ link: token }} className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary/10 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/15">
        {hi ? "इस बच्चे को अपने पैरेंट अकाउंट में सेव करें" : "Save this child to your parent account"}
        <span>→</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await linkByToken({ data: { token } }).catch(() => null);
        nav({ to: "/family" });
      }}
      className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-primary/10 px-5 py-3 text-left text-sm font-semibold text-primary hover:bg-primary/15"
    >
      {hi ? "मेरे अकाउंट में जोड़ें" : "Add to my family dashboard"}
      <span>→</span>
    </button>
  );
}
