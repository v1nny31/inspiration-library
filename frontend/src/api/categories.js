// Fetches for the /api/categories routes in server/api.js.
import { apiFetch } from './client';

/** GET /api/categories?section= — a section's categories, alphabetical, with `inspirations_count`. */
export async function listCategories(section) {
  return (await apiFetch(`/categories?section=${section}`)).data;
}

/** POST /api/categories — create a category in a section. */
export async function createCategory(name, section) {
  return (await apiFetch('/categories', { method: 'POST', body: { name, section } })).data;
}

/** DELETE /api/categories/{section}/{id} — its screenshots are kept and become uncategorized. */
export function deleteCategory(section, id) {
  return apiFetch(`/categories/${encodeURIComponent(section)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
