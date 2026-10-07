import { useState } from 'react';

/** Free-form tags: Enter or comma adds one, Backspace on an empty input removes the last. */
export default function TagInput({ id, tags, onChange }) {
  const [draft, setDraft] = useState('');

  function commit() {
    const tag = draft.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setDraft('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 transition focus-within:border-blurple focus-within:shadow-glow-blurple-sm">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-white/10 py-0.5 pr-1 pl-2 text-xs text-zinc-200">
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="rounded px-1 text-zinc-400 hover:bg-danger/20 hover:text-danger"
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={tags.length ? '' : 'dark mode, bento grid… (Enter to add)'}
        className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-zinc-600"
      />
    </div>
  );
}
