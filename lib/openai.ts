const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export class OpenAiUnavailableError extends Error {}

export function openAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function openAiPost<T = any>(path: string, body: unknown): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAiUnavailableError('OPENAI_API_KEY is not set.');

  const res = await fetch(`${OPENAI_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

/** Runs a chat completion constrained to a strict JSON schema and returns the parsed object. */
export async function openAiStructured<T>(opts: {
  model: string;
  schemaName: string;
  schema: object;
  messages: unknown[];
  temperature?: number;
}): Promise<T> {
  const body = await openAiPost('/chat/completions', {
    model: opts.model,
    temperature: opts.temperature ?? 0,
    response_format: { type: 'json_schema', json_schema: { name: opts.schemaName, strict: true, schema: opts.schema } },
    messages: opts.messages,
  });
  const message = body?.choices?.[0]?.message;
  if (message?.refusal) throw new Error(`OpenAI refused: ${message.refusal}`);
  return JSON.parse(message?.content ?? '{}') as T;
}
