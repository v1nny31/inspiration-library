import { useCallback, useEffect, useState } from 'react';
import { deleteLink, listLinks } from '../api/links';
import GroupSection from '../components/GroupSection';
import JumpBar from '../components/JumpBar';
import LinkForm from '../components/LinkForm';
import PageHeader from '../components/PageHeader';
import SideIndex from '../components/SideIndex';
import { SECTIONS } from '../lib/sections';
import { sounds } from '../lib/sound';
import { useScrollSpy } from '../lib/useScrollSpy';

/** Links to inspiration websites, grouped by library section. */
export default function LinksPage() {
  const [links, setLinks] = useState({ loaded: false, items: [] });
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    return listLinks()
      .then((items) => setLinks({ loaded: true, items }))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    listLinks()
      .then((items) => setLinks({ loaded: true, items }))
      .catch((err) => setError(err.message));
  }, []);

  // Every section always gets a group, so new sections appear here automatically.
  const groups = SECTIONS.map((section) => {
    const items = links.items.filter((link) => link.section === section.id);
    return { id: `links-${section.id}`, label: section.label, count: items.length, items };
  });
  const [activeId, jumpTo] = useScrollSpy(groups.map((group) => group.id));

  async function handleDelete(link) {
    if (!window.confirm(`Remove ${link.host} from your links?`)) {
      return;
    }
    try {
      await deleteLink(link.id);
      sounds.remove();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSaved() {
    sounds.success();
    setAdding(false);
    load();
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        action={
          <button
            type="button"
            onClick={() => {
              sounds.open();
              setAdding(true);
            }}
            className="rounded-lg bg-blurple px-4 py-2 text-sm font-semibold text-white shadow-glow-blurple-sm hover:-translate-y-0.5 hover:bg-blurple-hover hover:shadow-glow-blurple"
          >
            + Add link
          </button>
        }
      >
        <JumpBar label="Sections" items={groups} activeId={activeId} onJump={jumpTo} />
      </PageHeader>

      <div className="mx-auto grid max-w-[110rem] gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SideIndex title="Sections" items={groups} activeId={activeId} onJump={jumpTo} emptyText="No sections" />

        <main className="flex min-w-0 flex-col gap-14">
          {error && (
            <div role="alert" className="flex animate-fade-in-up items-center justify-between gap-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger shadow-glow-danger">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  load();
                }}
                className="shrink-0 font-medium underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}

          {groups.map((group) => (
            <GroupSection key={group.id} id={group.id} title={group.label} count={group.count}>
              {!links.loaded ? (
                <div className="h-28 animate-pulse rounded-xl bg-zinc-900" aria-hidden="true" />
              ) : group.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
                  No links yet.
                </p>
              ) : (
                <ul className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/60">
                  {group.items.map((link, index) => (
                    <li
                      key={link.id}
                      className="group relative animate-fade-in-up border-b border-white/5 last:border-b-0"
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      {/* A plain link: click or Ctrl/⌘+click opens the site in a new tab. */}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => sounds.hover(index)}
                        className="flex items-center gap-4 py-3.5 pr-14 pl-4 transition-colors duration-200 hover:bg-blurple/10 focus-visible:bg-blurple/10 focus-visible:outline-none"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-100 group-hover:text-white">{link.host}</span>
                          <span className="block truncate text-xs text-zinc-500">{link.url}</span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-zinc-600 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blurple-light"
                        >
                          ↗
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(link)}
                        aria-label={`Remove link ${link.host}`}
                        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-2 py-0.5 text-sm text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-danger/20 hover:text-danger hover:shadow-glow-danger focus-visible:opacity-100"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </GroupSection>
          ))}
        </main>
      </div>

      {adding && (
        <LinkForm
          onClose={() => {
            sounds.close();
            setAdding(false);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
