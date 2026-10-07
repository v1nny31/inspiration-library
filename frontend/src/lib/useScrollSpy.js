import { useCallback, useEffect, useRef, useState } from 'react';

// How long a jump owns the highlight, so a smooth scroll past other sections
// doesn't flicker through them in the index.
const JUMP_LOCK_MS = 800;

function headerHeight() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
}

/**
 * Tracks which of the sections with these element `ids` is currently at the
 * top of the page, and smoothly scrolls to one on request.
 *
 * @param {string[]} ids
 * @returns {[string|null, (id: string) => void]} the active id and `jumpTo`.
 */
export function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null);
  const lockedUntil = useRef(0);
  const idsKey = ids.join('|');

  useEffect(() => {
    const sectionIds = idsKey ? idsKey.split('|') : [];
    if (sectionIds.length === 0) {
      return undefined;
    }

    let frame = 0;
    function update() {
      frame = 0;
      if (performance.now() < lockedUntil.current) {
        return;
      }
      const line = headerHeight() + 48;
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top - line <= 0) {
          current = id;
        }
      }
      // Scrolled to the very bottom: the last section may be too short to reach the top.
      const atBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActiveId(atBottom ? sectionIds.at(-1) : current);
    }
    function schedule() {
      frame ||= requestAnimationFrame(update);
    }

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [idsKey]);

  const jumpTo = useCallback((id) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    lockedUntil.current = performance.now() + JUMP_LOCK_MS;
    setActiveId(id);
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);

  return [activeId, jumpTo];
}
