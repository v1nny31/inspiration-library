import { useState } from 'react';
import { isMuted, setMuted, sounds } from '../lib/sound';

/** Speaker button that turns the UI sounds on or off (remembered per browser). */
export default function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted);

  function toggle() {
    setMuted(!muted);
    setMutedState(!muted);
    sounds.click(); // Audible only when turning sound back on.
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Turn sounds on' : 'Turn sounds off'}
      aria-pressed={!muted}
      title={muted ? 'Sounds off' : 'Sounds on'}
      className="rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-blurple-light"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        {muted ? (
          <path d="m22 9-6 6m0-6 6 6" />
        ) : (
          <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
        )}
      </svg>
    </button>
  );
}
