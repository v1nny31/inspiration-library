/**
 * One titled block of a page (a category, or a links section) with a fading
 * separator line. Its `id` is what the side index and jump bar scroll to.
 */
export default function GroupSection({ id, title, count, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="anchor-under-header animate-fade-in-up">
      <header className="mb-5 flex items-center gap-3">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">{count}</span>
        <div aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-white/15 via-white/5 to-transparent" />
      </header>
      {children}
    </section>
  );
}
