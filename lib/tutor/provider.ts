import { spawn } from "node:child_process";
import { renderTranscript } from "./prompt";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Two providers, chosen by environment:
 *  - ANTHROPIC_API_KEY set → the Messages API directly (cloud deploys).
 *  - otherwise → the local `claude` CLI in print mode, which uses the
 *    machine's subscription login. Tools disabled, one turn, no session file.
 */
export function tutorProvider(): "api" | "cli" | "none" {
  if (process.env.ANTHROPIC_API_KEY) return "api";
  // No CLI on serverless hosts; APEX_TUTOR_CLI=0 disables it explicitly.
  if (process.env.VERCEL || process.env.APEX_TUTOR_CLI === "0") return "none";
  return "cli";
}

/** Shown to the student when no provider is available (cloud deploy without an API key). */
export const TUTOR_UNAVAILABLE = "The tutor isn't enabled on this deployment. Run the app on your laptop (where `claude` is signed in) for tutor sessions, or add ANTHROPIC_API_KEY to the cloud environment.";

export const TUTOR_MODEL = process.env.APEX_TUTOR_MODEL ?? "sonnet";

/** Streams the tutor's reply as text chunks. */
export function streamTutor(systemPrompt: string, messages: ChatMessage[], signal?: AbortSignal): ReadableStream<Uint8Array> {
  const p = tutorProvider();
  if (p === "none") throw new Error(TUTOR_UNAVAILABLE);
  return p === "api" ? streamViaApi(systemPrompt, messages, signal) : streamViaCli(systemPrompt, messages, signal);
}

/** Non-streaming convenience (QA script, tests). */
export async function completeTutor(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const reader = streamTutor(systemPrompt, messages).getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

function streamViaCli(systemPrompt: string, messages: ChatMessage[], signal?: AbortSignal): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const prompt = renderTranscript(messages);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const child = spawn(
        process.env.APEX_CLAUDE_BIN ?? "claude",
        ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--no-session-persistence", "--model", TUTOR_MODEL, "--system-prompt", systemPrompt],
        { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" } },
      );
      let buf = "";
      let sawText = false;
      let finalText = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf8");
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: { type?: string; event?: { type?: string; delta?: { type?: string; text?: string } }; result?: string; is_error?: boolean };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "stream_event" && ev.event?.type === "content_block_delta" && ev.event.delta?.type === "text_delta" && ev.event.delta.text) {
            sawText = true;
            controller.enqueue(enc.encode(ev.event.delta.text));
          } else if (ev.type === "result") {
            if (ev.is_error) stderr += ` ${ev.result ?? ""}`;
            else finalText = ev.result ?? "";
          }
        }
      });
      child.stderr.on("data", (c: Buffer) => (stderr += c.toString("utf8")));
      child.on("error", (e) => controller.error(new Error(`claude CLI failed to start: ${e.message}`)));
      child.on("close", (code) => {
        // Fallback: if no partial deltas arrived (older CLI), emit the final result once.
        if (!sawText && finalText) controller.enqueue(enc.encode(finalText));
        if (code !== 0 && !sawText && !finalText) controller.error(new Error(`claude CLI exited ${code}: ${stderr.trim().slice(0, 300)}`));
        else controller.close();
      });
      child.stdin.end(prompt);
      signal?.addEventListener("abort", () => child.kill("SIGTERM"));
    },
  });
}

function streamViaApi(systemPrompt: string, messages: ChatMessage[], signal?: AbortSignal): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const model = process.env.APEX_TUTOR_API_MODEL ?? "claude-sonnet-5-5";
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        // The grounding block is identical across a conversation's turns, so cache it (large input discount).
        body: JSON.stringify({ model, max_tokens: 600, system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }], messages, stream: true }),
        signal,
      });
      if (!res.ok || !res.body) {
        controller.error(new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const data = p
            .split("\n")
            .find((l) => l.startsWith("data:"))
            ?.slice(5)
            .trim();
          if (!data) continue;
          try {
            const ev = JSON.parse(data) as { type: string; delta?: { type: string; text?: string } };
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) controller.enqueue(enc.encode(ev.delta.text));
          } catch {
            /* ignore */
          }
        }
      }
      controller.close();
    },
  });
}
