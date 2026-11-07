import { beforeEach, describe, expect, it } from 'vitest';
import { app } from './index';

describe('GET /health', () => {
  it('responds ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('POST /translate', () => {
  beforeEach(() => {
    delete process.env.LLM_API_KEY;
  });

  it('rejects an invalid body', async () => {
    const res = await app.request('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masked: '', language: 'fr' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 503 when no LLM provider is configured', async () => {
    const res = await app.request('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masked: 'Frais {{V0}}', language: 'ewo' }),
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'llm_not_configured' });
  });
});
