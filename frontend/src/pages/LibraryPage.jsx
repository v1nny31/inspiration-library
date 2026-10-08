import { useCallback, useEffect, useState } from 'react';
import { createCategory, deleteCategory, listCategories } from '../api/categories';
import { deleteInspiration, listInspirations } from '../api/inspirations';
import GroupSection from '../components/GroupSection';
import InspirationCard from '../components/InspirationCard';
import InspirationDetail from '../components/InspirationDetail';
import InspirationForm from '../components/InspirationForm';
import JumpBar from '../components/JumpBar';
import PageHeader from '../components/PageHeader';
import SideIndex from '../components/SideIndex';
import { sectionConfig } from '../lib/sections';
import { sounds } from '../lib/sound';
import { useScrollSpy } from '../lib/useScrollSpy';

const UNCATEGORIZED_ID = 'category-none';

/**
 * Everything in one library section (hero inspiration, components…), grouped
 * by category. The side index and the header pills scroll to a category.
 */
export default function LibraryPage({ section }) {
  const config = sectionConfig(section);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  // Bumped after every change so the screenshots re-fetch.
  const [reloadKey, setReloadKey] = useState(0);
  const [library, setLibrary] = useState({ key: null, items: [], error: null });
  const inspirations = library.items;
  const loading = library.key !== reloadKey;

  const [selected, setSelected] = useState(null);
  // null, { mode: 'create' } or { mode: 'edit', inspiration }
  const [form, setForm] = useState(null);

  const refreshCategories = useCallback(async () => {
    try {
      setCategories(await listCategories(section));
    } catch (err) {
      setError(err.message);
    }
  }, [section]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
    refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    listCategories(section)
      .then(setCategories)
      .catch((err) => setError(err.message));
  }, [section]);

  useEffect(() => {
    let cancelled = false;
    listInspirations(section)
      .then((items) => !cancelled && setLibrary({ key: reloadKey, items, error: null }))
      .catch((err) => !cancelled && setLibrary((previous) => ({ ...previous, key: reloadKey, error: err.message })));
    return () => {
      cancelled = true;
    };
  }, [section, reloadKey]);

  // One group per category (empty ones too, so they can be jumped to), plus
  // a trailing "Uncategorized" group only when something has no category.
  const groups = categories.map((category) => ({
    id: `category-${category.id}`,
    label: category.name,
    category,
    items: inspirations.filter((inspiration) => inspiration.category?.id === category.id),
  }));
  const uncategorized = inspirations.filter((inspiration) => !inspiration.category);
  if (uncategorized.length > 0) {
    groups.push({ id: UNCATEGORIZED_ID, label: 'Uncategorized', items: uncategorized, deletable: false });
  }
  const indexItems = groups.map((group) => ({ ...group, count: group.items.length }));
  const [activeId, jumpTo] = useScrollSpy(groups.map((group) => group.id));

  async function handleCreateCategory(name) {
    await createCategory(name, section);
    sounds.success();
    await refreshCategories();
  }

  async function handleDeleteCategory({ category }) {
    const count = inspirations.filter((inspiration) => inspiration.category?.id === category.id).length;
    const confirmed = window.confirm(
      `Delete the "${category.name}" category?` +
        (count ? ` Its ${count} ${config.item}${count === 1 ? '' : 's'} will stay in the library, uncategorized.` : ''),
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteCategory(section, category.id);
      sounds.remove();
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteInspiration(inspiration) {
    if (!window.confirm(`Delete "${inspiration.name}" and its screenshot? This can't be undone.`)) {
      return;
    }
    try {
      await deleteInspiration(inspiration.id);
      sounds.remove();
      setSelected(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function openDetail(inspiration) {
    sounds.open();
    setSelected(inspiration);
  }

  function openForm(nextForm) {
    sounds.open();
    setForm(nextForm);
  }

  function closeDetail() {
    sounds.close();
    setSelected(null);
  }

  function closeForm() {
    sounds.close();
    setForm(null);
  }

  function handleSaved(saved) {
    sounds.success();
    // After editing, return to the (updated) popup the edit was opened from.
    setSelected(form?.mode === 'edit' ? saved : null);
    setForm(null);
    reload();
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        action={
          <button
            type="button"
            onClick={() => openForm({ mode: 'create' })}
            className="rounded-lg bg-blurple px-4 py-2 text-sm font-semibold text-white shadow-glow-blurple-sm hover:-translate-y-0.5 hover:bg-blurple-hover hover:shadow-glow-blurple"
          >
            + Add {config.item}
          </button>
        }
      >
        <JumpBar label="Categories" items={indexItems} activeId={activeId} onJump={jumpTo} />
      </PageHeader>

      <div className="mx-auto grid max-w-[110rem] gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SideIndex
          title="Categories"
          items={indexItems}
          activeId={activeId}
          onJump={jumpTo}
          onAdd={handleCreateCategory}
          onDelete={handleDeleteCategory}
          emptyText="No categories yet"
        />

        <main className="flex min-w-0 flex-col gap-14">
          {(error || library.error) && (
            <div role="alert" className="flex animate-fade-in-up items-center justify-between gap-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger shadow-glow-danger">
              <span>{error ?? library.error}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  reload();
                }}
                className="shrink-0 font-medium underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}

          {!library.error && groups.length === 0 && (
            <div className="stagger flex flex-col items-center gap-4 py-24 text-center">
              <p className="text-zinc-400">No {config.item}s in {config.label} yet.</p>
              <button
                type="button"
                onClick={() => openForm({ mode: 'create' })}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:-translate-y-0.5 hover:bg-white/15"
              >
                Add your first {config.item}
              </button>
            </div>
          )}

          {groups.map((group) => (
            <GroupSection key={group.id} id={group.id} title={group.label} count={group.items.length}>
              {group.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
                  No {config.item}s in this category yet.
                </p>
              ) : (
                <ul
                  aria-busy={loading}
                  className={`grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${loading ? 'opacity-50' : ''}`}
                >
                  {group.items.map((inspiration, index) => (
                    <li
                      key={inspiration.id}
                      className="flex animate-fade-in-up"
                      // Cascade the first rows in; later cards share the last delay.
                      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                    >
                      <InspirationCard inspiration={inspiration} index={index} onOpen={openDetail} />
                    </li>
                  ))}
                </ul>
              )}
            </GroupSection>
          ))}
        </main>
      </div>

      {selected && !form && (
        <InspirationDetail
          inspiration={selected}
          onClose={closeDetail}
          onEdit={() => openForm({ mode: 'edit', inspiration: selected })}
          onDelete={() => handleDeleteInspiration(selected)}
        />
      )}

      {form && (
        <InspirationForm
          inspiration={form.mode === 'edit' ? form.inspiration : null}
          section={section}
          categories={categories}
          onCategoryCreated={refreshCategories}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
