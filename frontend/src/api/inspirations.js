// Fetches for backend/routes/api.php -> Route::apiResource('inspirations', ...).
import { apiFetch } from './client';

/**
 * GET /api/inspirations?section= — a section's screenshots, newest first.
 * @param {string} section - "hero" or "components".
 * @param {number|null} categoryId - only that category's screenshots when set.
 */
export async function listInspirations(section, categoryId = null) {
  const query = new URLSearchParams({ section });
  if (categoryId) {
    query.set('category', categoryId);
  }
  return (await apiFetch(`/inspirations?${query}`)).data;
}

/**
 * POST /api/inspirations — upload a screenshot with its details.
 * @param {{ image: File, section: string, name: string, website_url?: string, category_id: number|null, tags: string[], hero_prompt?: string, brief_prompt: string }} input
 */
export async function createInspiration({ image, tags, ...fields }) {
  const form = new FormData();
  form.append('image', image);
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== '') {
      form.append(key, value);
    }
  }
  tags.forEach((tag) => form.append('tags[]', tag));

  return (await apiFetch('/inspirations', { method: 'POST', body: form })).data;
}

/** PATCH /api/inspirations/{id} — update the details (the image stays the same). */
export async function updateInspiration(id, fields) {
  return (await apiFetch(`/inspirations/${id}`, { method: 'PATCH', body: fields })).data;
}

/** DELETE /api/inspirations/{id} — removes the record and its image file. */
export function deleteInspiration(id) {
  return apiFetch(`/inspirations/${id}`, { method: 'DELETE' });
}
