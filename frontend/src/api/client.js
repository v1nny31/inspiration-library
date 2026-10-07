// Small fetch wrapper shared by every file in src/api/.
// It builds the full URL, sends JSON or multipart bodies, and turns non-2xx
// responses into a single, predictable error type.

// Falls back to the local Laravel dev server if VITE_API_URL isn't set.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Thrown for any non-2xx API response so callers can catch one error type
// and still read the HTTP status and Laravel's validation error bag.
export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Laravel validation errors: { field: ['message', ...], ... }
    this.errors = errors ?? null;
  }
}

/**
 * Call the Laravel JSON API.
 *
 * @param {string} path - endpoint path starting with "/", e.g. "/categories".
 * @param {object} [options]
 * @param {string} [options.method] - HTTP method, defaults to "GET".
 * @param {object|FormData} [options.body] - plain object (sent as JSON) or FormData (sent as multipart).
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body } = options;
  const isForm = body instanceof FormData;

  const headers = { Accept: 'application/json' };
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      // The browser sets the multipart boundary itself for FormData.
      body: body === undefined || isForm ? body : JSON.stringify(body),
    });
  } catch {
    // fetch() itself throws when the server can't be reached at all.
    throw new ApiError(
      `Couldn't reach the API at ${API_BASE_URL}. Make sure the backend is running (composer dev).`,
      0,
    );
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    // 413 comes from PHP itself, before Laravel runs, so it has no JSON body.
    const message =
      response.status === 413
        ? 'That file is too large for the server.'
        : data?.message || `Request failed with status ${response.status}.`;

    throw new ApiError(message, response.status, data?.errors);
  }

  return data;
}
