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

const SIDECAR_URL = process.env.EDIMA_SIDECAR_URL ?? 'http://127.0.0.1:8000';
const SIDECAR_TIMEOUT_MS = Number(process.env.EDIMA_SIDECAR_TIMEOUT_MS ?? 20000);

export const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));

app.post('/translate', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = TranslateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_request', details: parsed.error.flatten() }, 400);
  }

  // The local M2M100 sidecar only serves Duala today. Ewondo stays on the
  // original French until a model for it exists, which is the same safe
  // fallback as an unreachable sidecar.
  if (parsed.data.language !== 'dua') {
    return c.json({ error: 'language_not_supported' }, 503);
  }

  // The sidecar receives `parsed.data.masked` only — the same {{Vn}} tokens
  // as the request, never the real amounts/names. The extension
  // (utils/messages.ts, TranslateUnknownResponse) reinserts the values, runs
  // F10's verifyValuesIntact() check, and only then tags the line source
  // "ia" for the "non vérifié" badge (D1).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SIDECAR_TIMEOUT_MS);
  try {
    const response = await fetch(`${SIDECAR_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masked: parsed.data.masked, language: parsed.data.language }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return c.json({ error: 'model_unavailable' }, 503);
    }

    const data = (await response.json()) as { translated?: string | null };
    if (typeof data.translated !== 'string' || data.translated.length === 0) {
      return c.json({ error: 'model_unavailable' }, 503);
    }

    return c.json({ translated: data.translated });
  } catch {
    // Timeout, connection refused, malformed JSON: the client always falls
    // back to the French original rather than guessing.
    return c.json({ error: 'model_unavailable' }, 503);
  } finally {
    clearTimeout(timeout);
  }
});

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port });
  console.log(`[edima-server] listening on http://localhost:${port}`);
}
