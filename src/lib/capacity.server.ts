import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";

const Day = z.object({
  day: z.string().max(12),
  open: z.boolean(),
  sessions: z.string().max(80), // e.g. "10:00-13:00, 17:30-20:30"
  staff: z.number().min(0).max(50),
  slotMinutes: z.number().min(5).max(120),
  requests: z.number().min(0).max(5000),
  booked: z.number().min(0).max(5000),
  noShows: z.number().min(0).max(5000),
  avgWaitMin: z.number().min(0).max(1000),
});

export const CapacityInput = z.object({
  days: z.array(Day).min(1).max(7),
  peakNotes: z.string().max(1500).optional().default(""),
  constraints: z.string().max(1500).optional().default(""),
});

const SYSTEM = `You are an operations analyst for a small Indian paediatric vaccination clinic.
Given weekly clinic hours, staffing, slot length and appointment demand, identify scheduling bottlenecks and suggest practical capacity changes.
Compute capacity per day = total session minutes / slot minutes * staff. Compare with requests and booked; note utilisation, unmet demand, no-show rate and waits.
Respond in plain text (no markdown tables), under 350 words, with exactly these headings on their own lines:
SUMMARY
BOTTLENECKS
SUGGESTED CHANGES
QUICK WINS THIS WEEK
Each list item on its own line starting with "- ". Be concrete (days, times, numbers). Respect stated constraints. Never suggest changing vaccine schedules or clinical intervals.`;

export async function handleCapacity(request: Request) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return new Response("AI is not configured.", { status: 500 });

  let input: z.infer<typeof CapacityInput>;
  try {
    input = CapacityInput.parse(await request.json());
  } catch {
    return new Response("Please check the numbers you entered.", { status: 400 });
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  let upstreamError: unknown = null;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: SYSTEM,
    prompt: `Clinic week data (JSON):\n${JSON.stringify(input.days)}\n\nPeak-time notes: ${input.peakNotes || "none"}\nConstraints: ${input.constraints || "none"}`,
    abortSignal: request.signal,
    onError: ({ error }) => {
      upstreamError = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  void upstreamError;

  return withLovableAiGatewayRunIdHeader(result.toTextStreamResponse(), runIdFetch);
}
