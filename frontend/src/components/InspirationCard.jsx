import { sounds } from '../lib/sound';

const VISIBLE_TAGS = 4;

/** Track the cursor in CSS variables so the spotlight can follow it without re-rendering. */
function moveSpotlight(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
}

/** One screenshot in the grid. The whole card opens the detail popup. */
export default function InspirationCard({ inspiration, index = 0, onOpen }) {
  const { name, image_url: imageUrl, category, tags } = inspiration;
  const hiddenTags = tags.length - VISIBLE_TAGS;

  return (
    <button
      type="button"
      onClick={() => onOpen(inspiration)}
      onMouseEnter={() => sounds.hover(index)}
      onMouseMove={moveSpotlight}
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-white/5 bg-zinc-900 text-left duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-blurple/60 hover:shadow-glow-blurple focus-visible:ring-2 focus-visible:ring-blurple focus-visible:outline-none"
    >
      <div className="aspect-[4/3] overflow-hidden bg-zinc-800">
        {/* object-top: full-page screenshots are tall, the top is the most telling part. */}
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="size-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-medium text-zinc-100">{name}</h3>
          <span className="shrink-0 rounded-md bg-blurple/15 px-2 py-0.5 text-xs font-medium text-blurple-light">
            {category?.name ?? 'Uncategorized'}
          </span>
        </div>

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {tags.slice(0, VISIBLE_TAGS).map((tag) => (
              <li key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                {tag}
              </li>
            ))}
            {hiddenTags > 0 && <li className="px-1 py-0.5 text-xs text-zinc-500">+{hiddenTags}</li>}
          </ul>
        )}
      </div>

      {/* Soft blurple spotlight that follows the cursor. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(360px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgb(88 101 242 / 0.16), transparent 65%)',
        }}
      />
    </button>
  );
}
