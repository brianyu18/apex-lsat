import { tutorContext } from "@/lib/tutor/context";
import { streamTutor, tutorProvider, TUTOR_UNAVAILABLE, type ChatMessage } from "@/lib/tutor/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { questionId, attemptId?, messages: [{role, content}] } → text/plain stream of the reply.
 * The last message must be from the student.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { questionId: string; attemptId?: string | null; messages: ChatMessage[] };
  if (!body.questionId || !Array.isArray(body.messages) || !body.messages.length) return new Response("questionId and messages required", { status: 400 });
  const messages = body.messages.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()).slice(-12);
  if (messages[messages.length - 1]?.role !== "user") return new Response("last message must be from the student", { status: 400 });
  if (tutorProvider() === "none") return new Response(TUTOR_UNAVAILABLE, { status: 503 });
  const ctx = await tutorContext(body.questionId, body.attemptId ?? null);
  if (!ctx) return new Response("question not found", { status: 404 });
  try {
    const stream = streamTutor(ctx.systemPrompt, messages, req.signal);
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-tutor-provider": tutorProvider() } });
  } catch (e) {
    return new Response(`tutor unavailable: ${(e as Error).message}`, { status: 503 });
  }
}

export async function GET() {
  return Response.json({ provider: tutorProvider() });
}
