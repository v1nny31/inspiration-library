import { sectionConfig } from '../lib/sections';
import CopyButton from './CopyButton';
import Modal from './Modal';

/**
 * The large popup for one inspiration: the full screenshot (scrollable, since
 * full-page captures are tall) next to its details and the prompt buttons.
 */
export default function InspirationDetail({ inspiration, onClose, onEdit, onDelete }) {
  const {
    name,
    image_url: imageUrl,
    website_url: websiteUrl,
    category,
    tags,
    hero_prompt: heroPrompt,
    brief_prompt: briefPrompt,
  } = inspiration;
  const config = sectionConfig(inspiration.section);

  return (
    <Modal onClose={onClose} labelledBy="inspiration-title" className="flex h-full max-w-7xl flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-950">
        <img src={imageUrl} alt={name} className="w-full" />
      </div>

      <aside className="stagger flex max-h-[50%] shrink-0 flex-col gap-6 overflow-y-auto border-t border-white/10 p-6 lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-wider text-blurple-light uppercase text-shadow-glow-blurple">
              {category?.name ?? 'Uncategorized'}
            </p>
            <h2 id="inspiration-title" className="text-xl font-semibold text-white">
              {name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 rounded-lg px-2.5 py-1 text-xl text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </header>

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {tags.map((tag) => (
              <li key={tag} className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                {tag}
              </li>
            ))}
          </ul>
        )}

        <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-zinc-200">Prompts</h3>
          <div className="flex flex-col gap-1.5">
            <CopyButton text={briefPrompt} label={config.briefCopyLabel} />
            <p className="text-xs text-zinc-500">{config.briefHint}</p>
          </div>
          {config.hasHeroPrompt && (
            <div className="flex flex-col gap-1.5">
              <CopyButton text={heroPrompt} label="Copy hero image prompt" />
              <p className="text-xs text-zinc-500">For an image generator (Higgsfield, Midjourney…): a new hero visual in this style.</p>
            </div>
          )}
        </section>

        <div className="flex flex-col items-start gap-2">
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-zinc-400 underline-offset-4 hover:text-blurple-light hover:underline"
            >
              Visit website ↗
            </a>
          )}
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-400 underline-offset-4 hover:text-blurple-light hover:underline"
          >
            Open original image ↗
          </a>
        </div>

        <footer className="mt-auto flex gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:-translate-y-0.5 hover:bg-white/15"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-4 py-2 text-sm font-medium text-danger hover:-translate-y-0.5 hover:bg-danger/10 hover:shadow-glow-danger"
          >
            Delete
          </button>
        </footer>
      </aside>
    </Modal>
  );
}
