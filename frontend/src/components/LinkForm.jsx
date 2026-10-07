import { useState } from 'react';
import { createLink } from '../api/links';
import { SECTIONS } from '../lib/sections';
import Modal from './Modal';

const label = 'text-sm font-medium text-zinc-300';
const field =
  'w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 transition focus:border-blurple focus:shadow-glow-blurple-sm';

/** Small popup to add a website link to one of the library sections. */
export default function LinkForm({ onClose, onSaved }) {
  const [url, setUrl] = useState('');
  const [section, setSection] = useState(SECTIONS[0].id);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      onSaved(await createLink({ url: url.trim(), section }));
    } catch (err) {
      setErrors(err.errors ?? {});
      // Field errors are shown under their field; anything else goes in the footer.
      setError(err.errors ? null : err.message);
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="link-form-title" className="max-w-md">
      <form onSubmit={submit} className="flex flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 id="link-form-title" className="text-lg font-semibold text-white">
            Add a link
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

        <fieldset disabled={saving} className="stagger flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="link-url" className={label}>Link</label>
            <input
              id="link-url"
              type="url"
              autoFocus
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className={field}
            />
            {errors.url && <p className="text-xs text-danger">{errors.url[0]}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="link-section" className={label}>Section</label>
            <select id="link-section" value={section} onChange={(event) => setSection(event.target.value)} className={field}>
              {SECTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.section && <p className="text-xs text-danger">{errors.section[0]}</p>}
          </div>
        </fieldset>

        <footer className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          {error && <p role="alert" className="mr-auto text-sm text-danger">{error}</p>}
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !url.trim()}
            className="rounded-lg bg-blurple px-5 py-2 text-sm font-semibold text-white shadow-glow-blurple-sm enabled:hover:-translate-y-0.5 enabled:hover:bg-blurple-hover enabled:hover:shadow-glow-blurple disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? 'Adding…' : 'Add link'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
