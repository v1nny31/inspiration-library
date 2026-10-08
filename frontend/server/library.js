// The library on disk: plain JSON files and images, meant to be committed so
// the same library can be synced between devices with git.
//
//   library/
//     links.json                 every link, oldest first
//     <section>/                 one folder per tab (src/lib/sections.js)
//       categories.json          category names, alphabetical
//       <inspiration id>/        one folder per screenshot
//         info.json              name, category name, tags, prompts…
//         screenshot.png
//
// Everything is read from disk on every request, so changes pulled with git
// (or made by hand) show up on the next page load.
import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { SECTIONS } from '../src/lib/sections.js';

const SECTION_IDS = SECTIONS.map((section) => section.id);

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// Detected from the file's first bytes, not its name or claimed type. SVG is
// deliberately excluded: it can carry scripts.
const IMAGE_TYPES = [
  { extension: 'png', mime: 'image/png', matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { extension: 'jpg', mime: 'image/jpeg', matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { extension: 'gif', mime: 'image/gif', matches: (bytes) => ['GIF87a', 'GIF89a'].includes(bytes.toString('latin1', 0, 6)) },
  { extension: 'webp', mime: 'image/webp', matches: (bytes) => bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP' },
];

/** Invalid input: `errors` is `{ field: ['message', ...] }`. */
export class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors)[0][0]);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('Not found.');
    this.name = 'NotFoundError';
  }
}

/** "Landing Page" -> "landing-page". Category ids and screenshot folder names are slugs. */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

// Ids and file names come from URLs: they must stay a single path segment
// inside the library folder.
function isSafeName(value) {
  return typeof value === 'string' && value !== '' && !value.startsWith('.') && !/[/\\\0]/.test(value);
}

function byName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

// Collects error messages per field.
class Validator {
  errors = {};

  fail(field, message) {
    (this.errors[field] ??= []).push(message);
  }

  /** A trimmed string, or null when empty. */
  text(field, value, { required = false, max }) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      this.fail(field, `The ${field} field must be a string.`);
      return null;
    }
    const cleaned = value?.trim() || null;
    if (cleaned === null) {
      if (required) {
        this.fail(field, `The ${field} field is required.`);
      }
      return null;
    }
    if (cleaned.length > max) {
      this.fail(field, `The ${field} field must not be greater than ${max} characters.`);
    }
    return cleaned;
  }

  section(value) {
    if (value === undefined || value === null || value === '') {
      this.fail('section', 'The section field is required.');
    } else if (!SECTION_IDS.includes(value)) {
      this.fail('section', 'The selected section is invalid.');
    }
    return value;
  }

  // Web links only: they are rendered as clickable anchors.
  webUrl(field, value, { required = false } = {}) {
    const url = this.text(field, value, { required, max: 2048 });
    if (url === null) {
      return null;
    }
    let parsed = null;
    try {
      parsed = new URL(url);
    } catch {
      // Reported below.
    }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      this.fail(field, `The ${field} field must be a valid URL.`);
    }
    return url;
  }

  /** Tags are stored trimmed, lowercased and de-duplicated, so "Dark Mode" and "dark mode " are one tag. */
  tags(value) {
    if (value === undefined || value === null) {
      return [];
    }
    if (!Array.isArray(value)) {
      this.fail('tags', 'The tags field must be an array.');
      return [];
    }
    if (value.length > 20) {
      this.fail('tags', 'The tags field must not have more than 20 items.');
    }
    value.forEach((tag, index) => this.text(`tags.${index}`, tag, { max: 40 }));
    const normalized = value.filter((tag) => typeof tag === 'string').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    return [...new Set(normalized)];
  }

  throwIfFailed() {
    if (Object.keys(this.errors).length > 0) {
      throw new ValidationError(this.errors);
    }
  }
}

export class Library {
  /** @param {string} root - the library folder. It is created on the first write. */
  constructor(root) {
    this.root = root;
  }

  // ---- Categories ---------------------------------------------------------

  /** Alphabetical, with `inspirations_count`. An unknown or missing section lists every section. */
  async listCategories(section) {
    const lists = await Promise.all(
      this.#sections(section).map(async (id) => {
        const entries = await this.#entries(id);
        const categories = await this.#categories(id, entries);
        return categories.map((category) => ({
          ...category,
          inspirations_count: entries.filter((entry) => slugify(entry.category) === category.id).length,
        }));
      }),
    );
    return lists.flat().sort(byName);
  }

  async createCategory(input) {
    const validator = new Validator();
    const section = validator.section(input.section);
    const name = validator.text('name', input.name, { required: true, max: 60 });
    if (name && !slugify(name)) {
      validator.fail('name', 'The name must contain a letter or a number.');
    }
    validator.throwIfFailed();

    // Unique within its section only: "Cards" can exist in each tab.
    const existing = await this.#categories(section, await this.#entries(section));
    if (existing.some((category) => category.id === slugify(name))) {
      validator.fail('name', 'The name has already been taken.');
      validator.throwIfFailed();
    }

    const names = [...(await this.#storedCategoryNames(section)), name];
    await this.#writeJson(this.#categoriesFile(section), names.sort((a, b) => byName({ name: a }, { name: b })));
    return { id: slugify(name), section, name, inspirations_count: 0 };
  }

  /** Screenshots in the category are kept and become uncategorized. */
  async deleteCategory(section, id) {
    if (!SECTION_IDS.includes(section)) {
      throw new NotFoundError();
    }
    const entries = await this.#entries(section);
    const categories = await this.#categories(section, entries);
    if (!categories.some((category) => category.id === id)) {
      throw new NotFoundError();
    }

    const names = await this.#storedCategoryNames(section);
    await this.#writeJson(
      this.#categoriesFile(section),
      names.filter((name) => slugify(name) !== id),
    );
    for (const entry of entries.filter((item) => slugify(item.category) === id)) {
      await this.#writeEntry({ ...entry, category: null });
    }
  }

  // ---- Inspirations -------------------------------------------------------

  /** Newest first. `section` narrows the list to one tab and `category` (a category id) to one category. */
  async listInspirations({ section, category } = {}) {
    const lists = await Promise.all(
      this.#sections(section).map(async (id) => {
        const entries = await this.#entries(id);
        const categories = await this.#categories(id, entries);
        return entries
          .filter((entry) => !category || slugify(entry.category) === category)
          .map((entry) => this.#toInspiration(entry, categories));
      }),
    );
    return lists
      .flat()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id.localeCompare(a.id));
  }

  async getInspiration(id) {
    const entry = await this.#findEntry(id);
    return this.#toInspiration(entry, await this.#categories(entry.section, await this.#entries(entry.section)));
  }

  /**
   * @param {object} input - section, name, category_id, website_url, tags, hero_prompt, brief_prompt.
   * @param {Buffer|null} image - the uploaded file's bytes.
   */
  async createInspiration(input, image) {
    const validator = new Validator();
    const section = validator.section(input.section);
    const imageType = this.#validateImage(validator, image);
    const attributes = SECTION_IDS.includes(section)
      ? await this.#validateAttributes(validator, section, input, { partial: false })
      : {};
    validator.throwIfFailed();

    const id = await this.#newEntryId(section, attributes.name);
    const imageName = `screenshot.${imageType.extension}`;
    await mkdir(this.#entryDir(section, id), { recursive: true });
    await writeFile(path.join(this.#entryDir(section, id), imageName), image);

    const entry = {
      id,
      section,
      name: attributes.name,
      category: attributes.category ?? null,
      website_url: attributes.website_url ?? null,
      tags: attributes.tags ?? [],
      brief_prompt: attributes.brief_prompt ?? null,
      hero_prompt: attributes.hero_prompt ?? null,
      image: imageName,
      created_at: new Date().toISOString(),
    };
    await this.#writeEntry(entry);
    return this.getInspiration(id);
  }

  /** Only the fields present are changed. The section and the image stay the same. */
  async updateInspiration(id, input) {
    const entry = await this.#findEntry(id);
    const validator = new Validator();
    const attributes = await this.#validateAttributes(validator, entry.section, input, { partial: true });
    validator.throwIfFailed();

    await this.#writeEntry({ ...entry, ...attributes });
    return this.getInspiration(id);
  }

  /** Removes the screenshot's whole folder, image included. */
  async deleteInspiration(id) {
    const entry = await this.#findEntry(id);
    await rm(this.#entryDir(entry.section, entry.id), { recursive: true, force: true });
  }

  /** The file behind an `image_url`, or null when it isn't a library image. */
  imageFile(section, id, name) {
    const type = IMAGE_TYPES.find((candidate) => name?.endsWith(`.${candidate.extension}`));
    if (!SECTION_IDS.includes(section) || !isSafeName(id) || !isSafeName(name) || !type) {
      return null;
    }
    return { path: path.join(this.#entryDir(section, id), name), mime: type.mime };
  }

  // ---- Links --------------------------------------------------------------

  /** Newest first. `section` narrows the list to one section. */
  async listLinks({ section } = {}) {
    const sections = this.#sections(section);
    const links = await this.#links();
    return links
      .map((link, position) => ({ link, position }))
      .filter(({ link }) => sections.includes(link.section))
      .sort((a, b) => String(b.link.created_at).localeCompare(String(a.link.created_at)) || b.position - a.position)
      .map(({ link }) => this.#toLink(link));
  }

  async createLink(input) {
    const validator = new Validator();
    const section = validator.section(input.section);
    const url = validator.webUrl('url', input.url, { required: true });
    validator.throwIfFailed();

    const links = await this.#links();
    if (links.some((link) => link.section === section && link.url === url)) {
      validator.fail('url', 'This link is already in that section.');
      validator.throwIfFailed();
    }

    const link = { id: randomBytes(4).toString('hex'), section, url, created_at: new Date().toISOString() };
    await this.#writeJson(this.#linksFile(), [...links, link]);
    return this.#toLink(link);
  }

  async deleteLink(id) {
    const links = await this.#links();
    if (!links.some((link) => link.id === id)) {
      throw new NotFoundError();
    }
    await this.#writeJson(
      this.#linksFile(),
      links.filter((link) => link.id !== id),
    );
  }

  // ---- Helpers ------------------------------------------------------------

  #sections(section) {
    return SECTION_IDS.includes(section) ? [section] : SECTION_IDS;
  }

  #categoriesFile(section) {
    return path.join(this.root, section, 'categories.json');
  }

  #linksFile() {
    return path.join(this.root, 'links.json');
  }

  #entryDir(section, id) {
    return path.join(this.root, section, id);
  }

  async #storedCategoryNames(section) {
    const names = await this.#readJson(this.#categoriesFile(section), []);
    return Array.isArray(names) ? names.filter((name) => typeof name === 'string') : [];
  }

  /**
   * The names in categories.json plus any category a screenshot uses but the
   * file is missing (e.g. after a git merge), so nothing is ever hidden.
   */
  async #categories(section, entries) {
    const byId = new Map();
    for (const name of [...(await this.#storedCategoryNames(section)), ...entries.map((entry) => entry.category)]) {
      const id = slugify(name);
      if (id && !byId.has(id)) {
        byId.set(id, { id, section, name });
      }
    }
    return [...byId.values()].sort(byName);
  }

  /** Every screenshot of a section, as stored in its info.json plus `id` and `section`. */
  async #entries(section) {
    let folders;
    try {
      folders = await readdir(path.join(this.root, section), { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
    const entries = await Promise.all(
      folders
        .filter((folder) => folder.isDirectory() && isSafeName(folder.name))
        .map(async (folder) => {
          const info = await this.#readJson(path.join(this.root, section, folder.name, 'info.json'), null);
          return info && { ...info, id: folder.name, section };
        }),
    );
    return entries.filter(Boolean);
  }

  async #findEntry(id) {
    if (isSafeName(id)) {
      for (const section of SECTION_IDS) {
        const info = await this.#readJson(path.join(this.#entryDir(section, id), 'info.json'), null);
        if (info) {
          return { ...info, id, section };
        }
      }
    }
    throw new NotFoundError();
  }

  async #newEntryId(section, name) {
    const base = slugify(name).slice(0, 40).replace(/-+$/, '') || 'screenshot';
    for (;;) {
      // The random suffix keeps ids unique across devices that sync through git.
      const id = `${base}-${randomBytes(3).toString('hex')}`;
      if (!(await this.#readJson(path.join(this.#entryDir(section, id), 'info.json'), null))) {
        return id;
      }
    }
  }

  async #writeEntry({ id, section, ...info }) {
    await this.#writeJson(path.join(this.#entryDir(section, id), 'info.json'), info);
  }

  #toInspiration(entry, categories) {
    const category = categories.find((candidate) => candidate.id === slugify(entry.category)) ?? null;
    return {
      id: entry.id,
      section: entry.section,
      name: entry.name,
      image_url: `/library/${entry.section}/${encodeURIComponent(entry.id)}/${encodeURIComponent(entry.image)}`,
      website_url: entry.website_url ?? null,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      hero_prompt: entry.hero_prompt ?? null,
      brief_prompt: entry.brief_prompt ?? null,
      category,
      created_at: entry.created_at ?? null,
    };
  }

  #validateImage(validator, image) {
    if (!image || image.length === 0) {
      validator.fail('image', 'The image field is required.');
      return null;
    }
    if (image.length > MAX_IMAGE_BYTES) {
      validator.fail('image', `The image must not be larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
      return null;
    }
    const type = IMAGE_TYPES.find((candidate) => candidate.matches(image));
    if (!type) {
      validator.fail('image', 'The image must be a PNG, JPG, WebP or GIF file.');
    }
    return type;
  }

  /** The editable fields, shared by create and update so the two can't drift apart. */
  async #validateAttributes(validator, section, input, { partial }) {
    const has = (field) => !partial || Object.hasOwn(input, field);
    const attributes = {};

    if (has('name')) {
      attributes.name = validator.text('name', input.name, { required: true, max: 120 });
    }
    if (has('category_id')) {
      attributes.category = null;
      const categoryId = input.category_id === null || input.category_id === undefined ? '' : String(input.category_id).trim();
      if (categoryId) {
        // Its category must be in the same section.
        const categories = await this.#categories(section, await this.#entries(section));
        const category = categories.find((candidate) => candidate.id === categoryId);
        if (category) {
          attributes.category = category.name;
        } else {
          validator.fail('category_id', 'The selected category is invalid.');
        }
      }
    }
    if (has('website_url')) {
      attributes.website_url = validator.webUrl('website_url', input.website_url);
    }
    if (has('tags')) {
      attributes.tags = validator.tags(input.tags);
    }
    if (has('hero_prompt')) {
      attributes.hero_prompt = validator.text('hero_prompt', input.hero_prompt, { max: 10000 });
    }
    if (has('brief_prompt')) {
      attributes.brief_prompt = validator.text('brief_prompt', input.brief_prompt, { max: 20000 });
    }
    return attributes;
  }

  async #links() {
    const links = await this.#readJson(this.#linksFile(), []);
    return Array.isArray(links) ? links : [];
  }

  #toLink(link) {
    let host = '';
    try {
      host = new URL(link.url).hostname.replace(/^www\./, '');
    } catch {
      // A hand-edited links.json may hold a bad URL; show it without a host.
    }
    return { id: link.id, section: link.section, url: link.url, host, created_at: link.created_at ?? null };
  }

  async #readJson(file, fallback) {
    let text;
    try {
      text = await readFile(file, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        return fallback;
      }
      throw error;
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      // Most likely an unresolved git merge conflict: say which file to fix.
      throw new Error(`${path.relative(this.root, file)} in the library is not valid JSON (${error.message}).`);
    }
  }

  // Written to a temporary file first so a crash never leaves half a file behind.
  async #writeJson(file, data) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
    await rename(temporary, file);
  }
}
