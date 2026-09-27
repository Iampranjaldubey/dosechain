import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { verifyCertificate } from "@/lib/media.functions";
import { Logo } from "@/components/Footprint";

export const Route = createFileRoute("/verify/$token")({
  head: () => ({
    meta: [
      { title: "Verify vaccination certificate — DoseChain" },
      { name: "description", content: "Check that a Nanhe Kadam Child Clinic vaccination certificate is genuine." },
      { property: "og:title", content: "Verify vaccination certificate — DoseChain" },
      { property: "og:description", content: "Genuine-certificate check for schools and parents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Verify,
});

function Verify() {
  const { token } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["verify", token], queryFn: () => verifyCertificate({ data: { token } }) });
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center"><Logo /></div>
        {isLoading && <p className="mt-8 text-muted-foreground">Checking…</p>}
        {!isLoading && !data && <p className="mt-8 font-semibold text-destructive">✗ No matching certificate found.</p>}
        {data && (
          <>
            <div className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-full bg-primary text-3xl text-primary-foreground">✓</div>
            <h1 className="mt-4 font-display text-3xl">Genuine certificate</h1>
            <p className="mt-1 text-muted-foreground">{data.certNo} · issued by {data.clinic?.clinic_name}</p>
            <p className="mt-6 text-lg"><b>{data.child.name}</b> has <b>{data.doses.length}</b> recorded vaccine doses.</p>
            <p className="mt-1 text-sm text-muted-foreground">Latest: {data.doses[data.doses.length - 1]?.en ?? "—"}</p>
            <p className="mt-6 text-xs text-muted-foreground">Only the first name is shown to protect the child's privacy.</p>
          </>
        )}
      </div>
    </div>
  );
}
