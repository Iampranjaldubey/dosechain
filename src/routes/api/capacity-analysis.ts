import { createFileRoute } from "@tanstack/react-router";
import { handleCapacity } from "@/lib/capacity.server";

export const Route = createFileRoute("/api/capacity-analysis")({
  server: { handlers: { POST: ({ request }) => handleCapacity(request) } },
});
