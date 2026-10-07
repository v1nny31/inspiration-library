import { useEffect, useState } from 'react';

// Module state, so it survives tab switches and resets on a full page load (or refresh).
const played = new Set();

/**
 * Whether the header part named `key` should play its entrance animation. Each
 * page mounts its own header, so without this the animation would replay on
 * every tab switch; it plays only the first time the part is `shown` after the
 * page loads. Decided once per mount so a re-render can't cut it short.
 */
export function useEntranceAnimation(key, shown = true) {
  const [animate] = useState(() => !played.has(key));

  useEffect(() => {
    if (shown) {
      played.add(key);
    }
  }, [key, shown]);

  return animate;
}
