import { useEffect, useRef, useState } from 'react';
import { createCategory } from '../api/categories';
import { createInspiration, updateInspiration } from '../api/inspirations';
import { sectionConfig } from '../lib/sections';
import Modal from './Modal';
import TagInput from './TagInput';

const NEW_CATEGORY = '__new';
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const label = 'text-sm font-medium text-zinc-300';
const field =
  'w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 transition focus:border-blurple focus:shadow-glow-blurple-sm';

/**
 * Add a new screenshot to `section` or, when `inspiration` is given, edit an
 * existing one's details (it stays in its own section).
 */
export default function InspirationForm({ inspiration = null, section, categories, onCategoryCreated, onClose, onSaved }) {
  const editing = inspiration !== null;
  const config = sectionConfig(inspiration?.section ?? section);

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(inspiration?.image_url ?? null);
  const [name, setName] = useState(inspiration?.name ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(inspiration?.website_url ?? '');
  const [categoryValue, setCategoryValue] = useState(inspiration?.category ? String(inspiration.category.id) : '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [tags, setTags] = useState(inspiration?.tags ?? []);
  const [heroPrompt, setHeroPrompt] = useState(inspiration?.hero_prompt ?? '');
  const [briefPrompt, setBriefPrompt] = useState(inspiration?.brief_prompt ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [dragging, setDragging] = useState(false);

  // Object URLs hold the file in memory until revoked.
  const objectUrlRef = useRef(null);
  useEffect(() => () => objectUrlRef.current && URL.revokeObjectURL(objectUrlRef.current), []);

  function pickImage(file) {
    if (!file) {
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Use a PNG, JPG, WebP or GIF screenshot.');
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(objectUrlRef.current);
    setError(null);
    setImage(file);
  }

  // Ctrl/Cmd+V a screenshot straight from the clipboard.
  useEffect(() => {
    if (editing) {
      return undefined;
    }
    function handlePaste(event) {
      const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) {
        event.preventDefault();
        pickImage(file);
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [editing]);

  async function resolveCategoryId() {
    if (categoryValue !== NEW_CATEGORY) {
      return categoryValue || null;
    }
    const wanted = newCategoryName.trim();
    if (!wanted) {
      return null;
    }
    const existing = categories.find((category) => category.name.toLowerCase() === wanted.toLowerCase());
    if (existing) {
      return existing.id;
    }
    const created = await createCategory(wanted, config.id);
    onCategoryCreated(created);
    // If saving the inspiration fails next, a retry must not create it twice.
    setCategoryValue(String(created.id));
    return created.id;
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const fields = {
        name: name.trim(),
        website_url: websiteUrl.trim(),
        category_id: await resolveCategoryId(),
        tags,
        ...(config.hasHeroPrompt && { hero_prompt: heroPrompt.trim() }),
        brief_prompt: briefPrompt.trim(),
      };
      const saved = editing
        ? await updateInspiration(inspiration.id, fields)
        : await createInspiration({ ...fields, section: config.id, image });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors ?? {});
      setSaving(false);
    }
  }

  const fieldError = (key) => fieldErrors[key]?.[0] && <p className="text-xs text-danger">{fieldErrors[key][0]}</p>;

  return (
    <Modal onClose={onClose} labelledBy="inspiration-form-title" className="flex max-w-5xl flex-col">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 id="inspiration-form-title" className="text-lg font-semibold text-white">
            {editing ? `Edit ${config.item}` : `Add a ${config.item}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2.5 py-1 text-xl text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
          {/* Image */}
          <div className="flex flex-col gap-3">
            {editing ? (
              <img src={previewUrl} alt={name} className="max-h-[28rem] w-full rounded-xl object-cover object-top" />
            ) : (
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  pickImage(event.dataTransfer.files[0]);
                }}
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed text-center transition ${
                  dragging ? 'border-blurple bg-blurple/10 shadow-glow-blurple' : 'border-white/15 hover:border-blurple/60'
                }`}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected screenshot" className="max-h-[28rem] w-full object-cover object-top" />
                ) : (
                  <>
                    <span className="text-sm font-medium text-zinc-200">Drop a screenshot, click to browse,</span>
                    <span className="text-sm text-zinc-400">or paste it with Ctrl/⌘ + V</span>
                    <span className="text-xs text-zinc-600">PNG, JPG, WebP or GIF · up to 20 MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={(event) => pickImage(event.target.files[0])}
                  className="sr-only"
                  aria-label="Screenshot file"
                />
              </label>
            )}
            {fieldError('image')}
          </div>

          {/* Details */}
          <fieldset disabled={saving} className="stagger flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="inspiration-name" className={label}>Name</label>
              <input
                id="inspiration-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                placeholder="Dark fintech dashboard"
                className={field}
              />
              {fieldError('name')}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="inspiration-website" className={label}>
                Website <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                id="inspiration-website"
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                maxLength={2048}
                placeholder="https://example.com"
                className={field}
              />
              {fieldError('website_url')}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="inspiration-category" className={label}>Category</label>
              <select
                id="inspiration-category"
                value={categoryValue}
                onChange={(event) => setCategoryValue(event.target.value)}
                className={field}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ New category…</option>
              </select>
              {categoryValue === NEW_CATEGORY && (
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  maxLength={60}
                  placeholder="New category name"
                  aria-label="New category name"
                  className={field}
                />
              )}
              {fieldError('category_id')}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="inspiration-tags" className={label}>Tags</label>
              <TagInput id="inspiration-tags" tags={tags} onChange={setTags} />
              {fieldError('tags')}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="inspiration-brief" className={label}>{config.briefLabel}</label>
              <textarea
                id="inspiration-brief"
                value={briefPrompt}
                onChange={(event) => setBriefPrompt(event.target.value)}
                rows={6}
                placeholder={config.briefPlaceholder}
                className={`${field} resize-y`}
              />
              {fieldError('brief_prompt')}
            </div>

            {config.hasHeroPrompt && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="inspiration-hero" className={label}>Hero image prompt</label>
                <textarea
                  id="inspiration-hero"
                  value={heroPrompt}
                  onChange={(event) => setHeroPrompt(event.target.value)}
                  rows={3}
                  placeholder="A prompt for an image generator to create a hero visual in this style."
                  className={`${field} resize-y`}
                />
                {fieldError('hero_prompt')}
              </div>
            )}
          </fieldset>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          {error && <p role="alert" className="mr-auto text-sm text-danger">{error}</p>}
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (!editing && !image) || !name.trim()}
            className="rounded-lg bg-blurple px-5 py-2 text-sm font-semibold text-white shadow-glow-blurple-sm enabled:hover:-translate-y-0.5 enabled:hover:bg-blurple-hover enabled:hover:shadow-glow-blurple disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to library'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
