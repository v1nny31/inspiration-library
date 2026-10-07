import { useEffect, useState } from 'react';
import { sounds } from '../lib/sound';

const LABELS = { copied: 'Copied!', failed: 'Copy failed' };

/** Copies `text` to the clipboard and briefly confirms it on the button. */
export default function CopyButton({ text, label, className = '' }) {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (status === 'idle') {
      return undefined;
    }
    const timer = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      sounds.success();
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      title={text ? undefined : 'No prompt saved yet — edit this inspiration to add one.'}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        status === 'copied'
          ? 'bg-blurple text-white shadow-glow-blurple'
          : 'bg-white text-zinc-900 enabled:hover:-translate-y-0.5 enabled:hover:bg-zinc-200'
      } ${className}`}
    >
      {LABELS[status] ?? label}
    </button>
  );
}
