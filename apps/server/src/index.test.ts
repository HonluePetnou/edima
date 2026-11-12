import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from './index';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function translateRequest(body: unknown) {
  return app.request('/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /health', () => {
  it('responds ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('POST /translate', () => {
  it('rejects an invalid body', async () => {
    const res = await translateRequest({ masked: '', language: 'fr' });
    expect(res.status).toBe(400);
  });

  it('returns 503 for a language the sidecar does not serve', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await translateRequest({ masked: 'Frais {{V0}}', language: 'ewo' });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'language_not_supported' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards masked Duala text to the sidecar and returns its translation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ translated: 'Ese le bolane mo ni.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await translateRequest({ masked: 'Frais {{V0}}', language: 'dua' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ translated: 'Ese le bolane mo ni.' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8000/translate');
    expect(JSON.parse(String(init.body))).toEqual({ masked: 'Frais {{V0}}', language: 'dua' });
  });

  it('returns 503 when the sidecar responds with an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));

    const res = await translateRequest({ masked: 'Frais {{V0}}', language: 'dua' });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'model_unavailable' });
  });

  it('returns 503 when the sidecar is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const res = await translateRequest({ masked: 'Frais {{V0}}', language: 'dua' });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'model_unavailable' });
  });

  it('returns 503 when the sidecar omits the translation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ translated: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const res = await translateRequest({ masked: 'Frais {{V0}}', language: 'dua' });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'model_unavailable' });
  });
});
