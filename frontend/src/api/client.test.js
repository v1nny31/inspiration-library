import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL, apiFetch, ApiError } from './client';

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => (body === undefined ? Promise.reject(new SyntaxError('no body')) : Promise.resolve(body)),
  };
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends plain objects as JSON and resolves with the parsed body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(201, { data: { id: 1 } }));

    await expect(apiFetch('/categories', { method: 'POST', body: { name: 'Dashboard' } })).resolves.toEqual({
      data: { id: 1 },
    });
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{"name":"Dashboard"}',
    });
  });

  it('sends FormData untouched so the browser sets the multipart boundary', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(201, { data: {} }));
    const form = new FormData();

    await apiFetch('/inspirations', { method: 'POST', body: form });

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/inspirations`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
  });

  it('resolves with null on 204 No Content', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(204));

    await expect(apiFetch('/inspirations/1', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('throws an ApiError carrying the status and validation errors', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(422, { message: 'The name has already been taken.', errors: { name: ['The name has already been taken.'] } }),
    );

    const error = await apiFetch('/categories', { method: 'POST', body: { name: 'x' } }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe('The name has already been taken.');
    expect(error.errors).toEqual({ name: ['The name has already been taken.'] });
  });

  it('explains a 413 from PHP, which has no JSON body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(413));

    await expect(apiFetch('/inspirations', { method: 'POST' })).rejects.toThrow('That file is too large for the server.');
  });

  it('reports an unreachable server distinctly', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const error = await apiFetch('/categories').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toContain("Couldn't reach the API");
  });
});
