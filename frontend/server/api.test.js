import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLibraryMiddleware } from './api.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-pixels')]);

let root;
let server;
let baseUrl;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'library-'));
  const middleware = createLibraryMiddleware(root);
  server = createServer((req, res) =>
    middleware(req, res, () => {
      res.statusCode = 418;
      res.end();
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  vi.useRealTimers();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

async function call(method, url, body) {
  const isForm = body instanceof FormData;
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: body === undefined || isForm ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined || isForm ? body : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function screenshotForm(fields, image = PNG, filename = 'shot.png') {
  const form = new FormData();
  if (image) {
    form.append('image', new Blob([image]), filename);
  }
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'tags') {
      value.forEach((tag) => form.append('tags[]', tag));
    } else {
      form.append(key, value);
    }
  }
  return form;
}

const createCategory = async (name, section = 'hero') => (await call('POST', '/api/categories', { name, section })).body.data;
const createScreenshot = async (fields) =>
  (await call('POST', '/api/inspirations', screenshotForm({ section: 'hero', name: 'Shot', ...fields }))).body.data;
const readLibraryJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

describe('categories', () => {
  it('lists categories alphabetically with their screenshot counts', async () => {
    await createCategory('Mobile');
    await createCategory('Dashboard');
    await createScreenshot({ category_id: 'mobile' });
    await createScreenshot({ category_id: 'mobile' });

    const { status, body } = await call('GET', '/api/categories');

    expect(status).toBe(200);
    expect(body.data).toEqual([
      { id: 'dashboard', section: 'hero', name: 'Dashboard', inspirations_count: 0 },
      { id: 'mobile', section: 'hero', name: 'Mobile', inspirations_count: 2 },
    ]);
  });

  it('lists only the categories of the requested section', async () => {
    await createCategory('Landing Page');
    await createCategory('Buttons', 'components');

    expect((await call('GET', '/api/categories?section=components')).body.data.map((c) => c.id)).toEqual(['buttons']);
    expect((await call('GET', '/api/categories?section=hero')).body.data.map((c) => c.id)).toEqual(['landing-page']);
  });

  it('creates a category in a section with a trimmed name and saves it to its section folder', async () => {
    const { status, body } = await call('POST', '/api/categories', { name: '  Pagination  ', section: 'components' });

    expect(status).toBe(201);
    expect(body.data).toEqual({ id: 'pagination', section: 'components', name: 'Pagination', inspirations_count: 0 });
    expect(await readLibraryJson('components/categories.json')).toEqual(['Pagination']);
  });

  it('allows the same category name in different sections', async () => {
    await createCategory('Cards');

    expect((await call('POST', '/api/categories', { name: 'Cards', section: 'components' })).status).toBe(201);
  });

  it.each([
    ['duplicate', 'Landing Page'],
    ['duplicate in another case', 'landing page'],
    ['empty', '   '],
    ['symbols only', '!!!'],
  ])('rejects a %s category name within a section', async (_, name) => {
    await createCategory('Landing Page');

    const { status, body } = await call('POST', '/api/categories', { name, section: 'hero' });

    expect(status).toBe(422);
    expect(body.errors).toHaveProperty('name');
  });

  it.each([
    ['missing', {}],
    ['unknown', { section: 'footers' }],
  ])('requires a known section (%s)', async (_, payload) => {
    const { status, body } = await call('POST', '/api/categories', { name: 'Buttons', ...payload });

    expect(status).toBe(422);
    expect(body.errors).toHaveProperty('section');
  });

  it('keeps screenshots when their category is deleted', async () => {
    await createCategory('Dashboard');
    const shot = await createScreenshot({ category_id: 'dashboard' });

    expect((await call('DELETE', '/api/categories/hero/dashboard')).status).toBe(204);

    expect((await call('GET', '/api/categories')).body.data).toEqual([]);
    expect((await call('GET', `/api/inspirations/${shot.id}`)).body.data.category).toBeNull();
    expect(await readLibraryJson(`hero/${shot.id}/info.json`)).toMatchObject({ category: null });
  });

  it('returns 404 for an unknown category', async () => {
    expect((await call('DELETE', '/api/categories/hero/nope')).status).toBe(404);
    expect((await call('DELETE', '/api/categories/footers/nope')).status).toBe(404);
  });
});

describe('inspirations', () => {
  it('stores a screenshot with its details as files', async () => {
    await createCategory('Dashboard');

    const { status, body } = await call(
      'POST',
      '/api/inspirations',
      screenshotForm({
        section: 'hero',
        name: 'Neon analytics',
        category_id: 'dashboard',
        website_url: ' https://neon.example.com/analytics ',
        tags: [' Dark Mode', 'dark mode ', 'Charts', '', '  '],
        hero_prompt: 'A glowing data landscape',
        brief_prompt: 'Build a dark dashboard',
      }),
    );

    expect(status).toBe(201);
    expect(body.data).toMatchObject({
      section: 'hero',
      name: 'Neon analytics',
      website_url: 'https://neon.example.com/analytics',
      category: { id: 'dashboard', section: 'hero', name: 'Dashboard' },
      tags: ['dark mode', 'charts'],
      hero_prompt: 'A glowing data landscape',
      brief_prompt: 'Build a dark dashboard',
    });
    const { id } = body.data;
    expect(id).toMatch(/^neon-analytics-[0-9a-f]{6}$/);
    expect(body.data.image_url).toBe(`/library/hero/${id}/screenshot.png`);

    expect(await readLibraryJson(`hero/${id}/info.json`)).toEqual({
      name: 'Neon analytics',
      category: 'Dashboard',
      website_url: 'https://neon.example.com/analytics',
      tags: ['dark mode', 'charts'],
      brief_prompt: 'Build a dark dashboard',
      hero_prompt: 'A glowing data landscape',
      image: 'screenshot.png',
      created_at: body.data.created_at,
    });
    expect(await readFile(path.join(root, 'hero', id, 'screenshot.png'))).toEqual(PNG);
  });

  it('serves the stored image at its image_url', async () => {
    const shot = await createScreenshot({});

    const response = await fetch(`${baseUrl}${shot.image_url}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(PNG);
  });

  it('allows a screenshot without a category, website, tags or prompts', async () => {
    const shot = await createScreenshot({ name: 'Bare' });

    expect(shot).toMatchObject({ category: null, website_url: null, tags: [], hero_prompt: null, brief_prompt: null });
  });

  it.each([
    ['text renamed to .png', Buffer.from('just text'), 'notes.png'],
    ['svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'logo.svg'],
    ['over 20 MB', Buffer.concat([PNG, Buffer.alloc(20 * 1024 * 1024)]), 'huge.png'],
  ])('rejects an image that is %s', async (_, image, filename) => {
    const { status, body } = await call('POST', '/api/inspirations', screenshotForm({ section: 'hero', name: 'Bad' }, image, filename));

    expect(status).toBe(422);
    expect(body.errors).toHaveProperty('image');
    expect(await readdir(root)).toEqual([]);
  });

  it('requires an image, a section, a name and an existing category', async () => {
    const { status, body } = await call('POST', '/api/inspirations', screenshotForm({ category_id: 'nope' }, null));

    expect(status).toBe(422);
    expect(Object.keys(body.errors)).toEqual(['section', 'image']);

    const second = await call('POST', '/api/inspirations', screenshotForm({ section: 'hero', category_id: 'nope' }));
    expect(Object.keys(second.body.errors)).toEqual(['name', 'category_id']);
  });

  it.each([
    ['not a url', 'neon analytics'],
    ['script', 'javascript:alert(1)'],
    ['other scheme', 'ftp://example.com/file'],
  ])('only accepts a web address as the website (%s)', async (_, url) => {
    const { status, body } = await call('POST', '/api/inspirations', screenshotForm({ section: 'hero', name: 'Bad link', website_url: url }));

    expect(status).toBe(422);
    expect(body.errors).toHaveProperty('website_url');
  });

  it('stores a component in a components category, in the components folder', async () => {
    await createCategory('Buttons', 'components');

    const shot = await createScreenshot({ section: 'components', name: 'Pill button', category_id: 'buttons' });

    expect(shot).toMatchObject({ section: 'components', category: { name: 'Buttons' } });
    expect(await readLibraryJson(`components/${shot.id}/info.json`)).toMatchObject({ category: 'Buttons' });
  });

  it('rejects a category from another section', async () => {
    await createCategory('Hero only');

    const created = await call(
      'POST',
      '/api/inspirations',
      screenshotForm({ section: 'components', name: 'Pill button', category_id: 'hero-only' }),
    );
    expect(created.status).toBe(422);
    expect(created.body.errors).toHaveProperty('category_id');

    const component = await createScreenshot({ section: 'components' });
    const updated = await call('PATCH', `/api/inspirations/${component.id}`, { category_id: 'hero-only' });
    expect(updated.status).toBe(422);
    expect(updated.body.errors).toHaveProperty('category_id');
  });

  it('lists only the screenshots of the requested section', async () => {
    const hero = await createScreenshot({});
    const component = await createScreenshot({ section: 'components' });

    expect((await call('GET', '/api/inspirations?section=components')).body.data.map((i) => i.id)).toEqual([component.id]);
    expect((await call('GET', '/api/inspirations?section=hero')).body.data.map((i) => i.id)).toEqual([hero.id]);
  });

  it('lists the newest screenshots first and filters by category', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await createCategory('Dashboard');
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const older = await createScreenshot({ category_id: 'dashboard' });
    vi.setSystemTime(new Date('2026-01-02T10:00:00Z'));
    const newer = await createScreenshot({ category_id: 'dashboard' });
    await createScreenshot({});

    expect((await call('GET', '/api/inspirations')).body.data).toHaveLength(3);
    expect((await call('GET', '/api/inspirations?category=dashboard')).body.data.map((i) => i.id)).toEqual([newer.id, older.id]);
  });

  it('updates only the given details, without touching the image', async () => {
    await createCategory('Dashboard');
    const shot = await createScreenshot({ tags: ['old'], website_url: 'https://keep.example.com' });

    const { status, body } = await call('PATCH', `/api/inspirations/${shot.id}`, {
      name: 'Renamed',
      category_id: 'dashboard',
      tags: ['New'],
      brief_prompt: 'Updated brief',
    });

    expect(status).toBe(200);
    expect(body.data).toMatchObject({
      id: shot.id,
      name: 'Renamed',
      category: { id: 'dashboard' },
      tags: ['new'],
      brief_prompt: 'Updated brief',
      website_url: 'https://keep.example.com',
      image_url: shot.image_url,
    });
    expect(await readFile(path.join(root, 'hero', shot.id, 'screenshot.png'))).toEqual(PNG);
  });

  it('changes and clears the website', async () => {
    const shot = await createScreenshot({ website_url: 'https://old.example.com' });

    expect((await call('PATCH', `/api/inspirations/${shot.id}`, { website_url: 'https://new.example.com' })).body.data.website_url).toBe(
      'https://new.example.com',
    );
    expect((await call('PATCH', `/api/inspirations/${shot.id}`, { website_url: '' })).body.data.website_url).toBeNull();
  });

  it('rejects an empty name on update', async () => {
    const shot = await createScreenshot({});

    const { status, body } = await call('PATCH', `/api/inspirations/${shot.id}`, { name: '  ' });

    expect(status).toBe(422);
    expect(body.errors).toHaveProperty('name');
  });

  it('deletes the screenshot folder along with the entry', async () => {
    const shot = await createScreenshot({});

    expect((await call('DELETE', `/api/inspirations/${shot.id}`)).status).toBe(204);

    expect((await call('GET', `/api/inspirations/${shot.id}`)).status).toBe(404);
    expect(await readdir(path.join(root, 'hero'))).toEqual([]);
  });

  it.each(['nope', '..', '.%2E', '..%2Fhero'])('returns 404 for an unknown or unsafe id (%s)', async (id) => {
    expect((await call('GET', `/api/inspirations/${id}`)).status).toBe(404);
    expect((await call('DELETE', `/api/inspirations/${id}`)).status).toBe(404);
  });

  it('shows screenshots pulled from another device, including categories missing from categories.json', async () => {
    await mkdir(path.join(root, 'hero', 'synced-shot'), { recursive: true });
    await writeFile(path.join(root, 'hero', 'synced-shot', 'screenshot.png'), PNG);
    await writeFile(
      path.join(root, 'hero', 'synced-shot', 'info.json'),
      JSON.stringify({ name: 'Synced', category: 'Footers', tags: ['dark'], image: 'screenshot.png', created_at: '2026-01-01T00:00:00Z' }),
    );

    expect((await call('GET', '/api/inspirations')).body.data).toMatchObject([
      { id: 'synced-shot', name: 'Synced', category: { id: 'footers', name: 'Footers' }, image_url: '/library/hero/synced-shot/screenshot.png' },
    ]);
    expect((await call('GET', '/api/categories')).body.data).toEqual([
      { id: 'footers', section: 'hero', name: 'Footers', inspirations_count: 1 },
    ]);
  });

  it('names the broken file when a JSON file is unreadable, e.g. after a merge conflict', async () => {
    await mkdir(path.join(root, 'hero'), { recursive: true });
    await writeFile(path.join(root, 'hero', 'categories.json'), '<<<<<<< HEAD\n["A"]\n=======\n["B"]\n>>>>>>> other\n');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { status, body } = await call('GET', '/api/categories?section=hero');

    expect(status).toBe(500);
    expect(body.message).toContain(path.join('hero', 'categories.json'));
  });
});

describe('links', () => {
  it('lists links newest first with their host', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const older = (await call('POST', '/api/links', { url: 'https://www.dribbble.com/shots/popular', section: 'hero' })).body.data;
    vi.setSystemTime(new Date('2026-01-02T10:00:00Z'));
    const newer = (await call('POST', '/api/links', { url: 'https://ui.shadcn.com', section: 'components' })).body.data;

    const { body } = await call('GET', '/api/links');

    expect(body.data.map((link) => link.id)).toEqual([newer.id, older.id]);
    expect(body.data[1]).toMatchObject({ host: 'dribbble.com', section: 'hero' });
    expect(body.data[0]).toMatchObject({ section: 'components' });
  });

  it('lists only the links of the requested section', async () => {
    const hero = (await call('POST', '/api/links', { url: 'https://godly.website', section: 'hero' })).body.data;
    const component = (await call('POST', '/api/links', { url: 'https://ui.shadcn.com', section: 'components' })).body.data;

    expect((await call('GET', '/api/links?section=components')).body.data.map((l) => l.id)).toEqual([component.id]);
    expect((await call('GET', '/api/links?section=hero')).body.data.map((l) => l.id)).toEqual([hero.id]);
  });

  it('adds a trimmed link to a section and saves it to links.json', async () => {
    const { status, body } = await call('POST', '/api/links', { url: '  https://www.godly.website  ', section: 'hero' });

    expect(status).toBe(201);
    expect(body.data).toMatchObject({ url: 'https://www.godly.website', host: 'godly.website', section: 'hero' });
    expect(await readLibraryJson('links.json')).toEqual([
      { id: body.data.id, section: 'hero', url: 'https://www.godly.website', created_at: body.data.created_at },
    ]);
  });

  it.each([
    ['empty', ''],
    ['not a url', 'dribbble'],
    ['javascript', 'javascript:alert(1)'],
    ['ftp', 'ftp://files.example.com'],
  ])('only accepts web links (%s)', async (_, url) => {
    const { status, body } = await call('POST', '/api/links', { url, section: 'hero' });

    expect(status).toBe(422);
    expect(body.errors).toHaveProperty('url');
  });

  it('requires a known section', async () => {
    const { status, body } = await call('POST', '/api/links', { url: 'https://dribbble.com', section: 'footers' });

    expect(status).toBe(422);
    expect(body.errors).toHaveProperty('section');
  });

  it('rejects a duplicate link within a section but allows it in another', async () => {
    await call('POST', '/api/links', { url: 'https://dribbble.com', section: 'hero' });

    const duplicate = await call('POST', '/api/links', { url: 'https://dribbble.com', section: 'hero' });
    expect(duplicate.status).toBe(422);
    expect(duplicate.body.errors.url[0]).toBe('This link is already in that section.');

    expect((await call('POST', '/api/links', { url: 'https://dribbble.com', section: 'components' })).status).toBe(201);
  });

  it('deletes a link', async () => {
    const link = (await call('POST', '/api/links', { url: 'https://dribbble.com', section: 'hero' })).body.data;

    expect((await call('DELETE', `/api/links/${link.id}`)).status).toBe(204);

    expect((await call('GET', '/api/links')).body.data).toEqual([]);
    expect((await call('DELETE', `/api/links/${link.id}`)).status).toBe(404);
  });
});

describe('routing', () => {
  it('answers unknown API routes with a JSON 404', async () => {
    expect(await call('GET', '/api/nope')).toEqual({ status: 404, body: { message: 'Not found.' } });
  });

  it('only serves images from inside the library', async () => {
    const shot = await createScreenshot({});

    expect((await fetch(`${baseUrl}/library/hero/${shot.id}/info.json`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/library/hero/..%2F..%2Fsrc/screenshot.png`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/library/..%2Fpublic/x/favicon.png`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/library/hero/${shot.id}/screenshot.png/extra`)).status).toBe(404);
  });

  it('leaves every other request to Vite', async () => {
    expect((await fetch(`${baseUrl}/hero`)).status).toBe(418);
  });
});
