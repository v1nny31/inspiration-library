// Fetches for backend/routes/api.php -> Route::apiResource('links', ...).
import { apiFetch } from './client';

/** GET /api/links — every link, newest first, each with its `section` and `host`. */
export async function listLinks() {
  return (await apiFetch('/links')).data;
}

/** POST /api/links — add a website link to a section. */
export async function createLink({ url, section }) {
  return (await apiFetch('/links', { method: 'POST', body: { url, section } })).data;
}

/** DELETE /api/links/{id} */
export function deleteLink(id) {
  return apiFetch(`/links/${id}`, { method: 'DELETE' });
}
