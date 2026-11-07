import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { z } from 'zod';
import { LanguageCode } from 'edima-shared';

// Fallback only: the extension tries the embedded glossary and template
// phrases first (F9's first two links). This single route is called only
// when neither matches, and it only ever receives already-masked text —
// amounts, names, dates and numbers never leave the device unmasked.
const TranslateRequestSchema = z.object({
  masked: z.string().min(1),
  language: LanguageCode,
});

export const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));

app.post('/translate', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = TranslateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_request', details: parsed.error.flatten() }, 400);
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    // Phase 2 plugs the real call in here (Vercel AI SDK). Until a provider
    // key is configured, the fallback is simply unavailable — the client
    // falls back to the original French rather than guessing.
    return c.json({ error: 'llm_not_configured' }, 503);
  }

  // TODO (Phase 2): call the LLM with `parsed.data.masked` only, and
  // respond `{ translated: string }` — still masked, same {{Vn}} tokens as
  // the request, untouched. The extension (utils/messages.ts,
  // TranslateUnknownResponse) reinserts the real values, runs F10's
  // verifyValuesIntact() check, and only then tags the line source "ia" for
  // the "non vérifié" badge (D1). Never resolve the tokens server-side —
  // the server never sees the real amounts/names in the first place.
  return c.json({ error: 'not_implemented' }, 501);
});

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port });
  console.log(`[edima-server] listening on http://localhost:${port}`);
}
