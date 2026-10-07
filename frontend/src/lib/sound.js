// Small UI sounds, synthesised with the Web Audio API (no audio files).
// Browsers only allow audio after the first click/keypress, so the audio
// context is created then; until that happens every sound is a silent no-op.

const MUTED_KEY = 'inspiration-library:sound-muted';
const MASTER_VOLUME = 0.08;
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
// Pentatonic notes (C5 D5 E5 G5 A5 C6): any run of hovers sounds pleasant.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
// Moving the mouse across a row of items shouldn't machine-gun notes.
const HOVER_GAP_MS = 45;

let context = null;
let lastHoverAt = -Infinity;

export function isMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    // Storage can be unavailable (private mode); muting just won't persist.
  }
}

/** Create/resume the audio context on the first user gesture. Call once at startup. */
export function unlockAudioOnFirstGesture() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }
  function unlock() {
    context ??= new AudioContextClass();
    context.resume().catch(() => {});
    UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, unlock, true));
  }
  UNLOCK_EVENTS.forEach((type) => document.addEventListener(type, unlock, { capture: true, passive: true }));
}

function tone({ frequency, endFrequency = frequency, duration, type = 'sine', volume = 1, delay = 0 }) {
  if (!context || context.state !== 'running' || isMuted()) {
    return;
  }
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  // A quick fade in and a long fade out keep it soft and click-free.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(MASTER_VOLUME * volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const sounds = {
  /** A soft note; `variant` picks the pitch so neighbouring items sound different. */
  hover(variant = 0) {
    const now = performance.now();
    if (now - lastHoverAt < HOVER_GAP_MS) {
      return;
    }
    lastHoverAt = now;
    tone({ frequency: SCALE[Math.abs(variant) % SCALE.length], duration: 0.09, volume: 0.45 });
  },
  click() {
    tone({ frequency: 880, endFrequency: 660, duration: 0.07, type: 'triangle', volume: 0.7 });
  },
  open() {
    tone({ frequency: 440, endFrequency: 880, duration: 0.16, volume: 0.6 });
  },
  close() {
    tone({ frequency: 660, endFrequency: 330, duration: 0.14, volume: 0.5 });
  },
  /** Two rising notes: saved, copied, created. */
  success() {
    tone({ frequency: 659.25, duration: 0.12, type: 'triangle', volume: 0.6 });
    tone({ frequency: 987.77, duration: 0.18, type: 'triangle', volume: 0.6, delay: 0.08 });
  },
  /** A low falling thud for anything deleted. */
  remove() {
    tone({ frequency: 220, endFrequency: 90, duration: 0.24, type: 'triangle', volume: 0.9 });
  },
};
