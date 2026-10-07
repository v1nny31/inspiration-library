import { useState } from 'react';
import { sounds } from '../lib/sound';

/**
 * The sticky side index: jumps to a section of the page and highlights the one
 * in view. On library pages the entries are categories: `onAdd` puts a plus
 * button next to the title that opens an inline "new category" form, and
 * `onDelete` gives each entry (unless `deletable: false`) a delete button.
 */
export default function SideIndex({ title, items, activeId, onJump, onAdd, onDelete, emptyText }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    try {
      await onAdd(name.trim());
      setName('');
      setAdding(false);
      setError(null);
    } catch (err) {
      setError(err.errors?.name?.[0] ?? err.message);
    }
  }

  function cancel() {
    setAdding(false);
    setName('');
    setError(null);
  }

  return (
    <aside aria-label={`${title} index`} className="hidden lg:block">
      <div className="sticky-under-header stagger flex flex-col gap-3 pr-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">{title}</h2>
          {onAdd && (
            <button
              type="button"
              onClick={() => (adding ? cancel() : setAdding(true))}
              aria-label="Add category"
              aria-expanded={adding}
              className={`grid size-6 place-items-center rounded-md text-zinc-400 hover:bg-blurple/20 hover:text-blurple-light hover:shadow-glow-blurple-sm ${
                adding ? 'rotate-45 text-blurple-light' : ''
              }`}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5" aria-hidden="true">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </button>
          )}
        </div>

        {adding && (
          <form onSubmit={submit} className="flex animate-fade-in flex-col gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && cancel()}
              placeholder="Name, then Enter"
              aria-label="New category name"
              maxLength={60}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-1.5 text-sm outline-none transition focus:border-blurple focus:shadow-glow-blurple-sm"
            />
            {error && <p className="text-xs text-danger">{error}</p>}
          </form>
        )}

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-sm text-zinc-500">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((item, index) => {
              const active = item.id === activeId;
              return (
                <li key={item.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.click();
                      onJump(item.id);
                    }}
                    onMouseEnter={() => sounds.hover(index)}
                    aria-current={active ? 'location' : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border-l-2 py-1.5 pr-8 pl-3 text-left text-sm transition-all duration-300 ${
                      active
                        ? 'border-blurple bg-blurple/10 text-white shadow-[-6px_0_14px_-6px_rgb(88_101_242_/_0.8)]'
                        : 'border-transparent text-zinc-400 hover:translate-x-1 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className={`text-xs ${active ? 'text-blurple-light' : 'text-zinc-600'}`}>{item.count}</span>
                  </button>
                  {onDelete && item.deletable !== false && (
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      aria-label={`Delete category ${item.label}`}
                      className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md px-1.5 text-xs text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-danger/20 hover:text-danger hover:shadow-glow-danger focus-visible:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
