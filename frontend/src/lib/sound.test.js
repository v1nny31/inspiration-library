import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const audioParam = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

// Records every oscillator so tests can check what would have been played.
class FakeAudioContext {
  static instances = [];
  state = 'running';
  currentTime = 0;
  destination = {};
  oscillators = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  resume() {
    return Promise.resolve();
  }

  createOscillator() {
    const oscillator = { frequency: audioParam(), connect: vi.fn((node) => node), start: vi.fn(), stop: vi.fn() };
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    return { gain: audioParam(), connect: vi.fn((node) => node) };
  }
}

// The module keeps its audio context in module state, so load a fresh copy per test.
async function loadSound() {
  vi.resetModules();
  return import('./sound');
}

const firstPitch = (context, index = 0) => context.oscillators[index].frequency.setValueAtTime.mock.calls[0][0];

describe('sound', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('stays silent until the first user gesture unlocks audio', async () => {
    const { sounds, unlockAudioOnFirstGesture } = await loadSound();
    unlockAudioOnFirstGesture();

    sounds.click();
    expect(FakeAudioContext.instances).toHaveLength(0);

    document.dispatchEvent(new Event('pointerdown'));
    sounds.click();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(1);
  });

  it('gives neighbouring items different notes', async () => {
    vi.useFakeTimers();
    const { sounds, unlockAudioOnFirstGesture } = await loadSound();
    unlockAudioOnFirstGesture();
    document.dispatchEvent(new Event('keydown'));
    const context = FakeAudioContext.instances[0];

    sounds.hover(0);
    vi.advanceTimersByTime(100);
    sounds.hover(1);

    expect(firstPitch(context, 0)).toBe(523.25);
    expect(firstPitch(context, 1)).toBe(587.33);
  });

  it('drops hover sounds that come too quickly after each other', async () => {
    const { sounds, unlockAudioOnFirstGesture } = await loadSound();
    unlockAudioOnFirstGesture();
    document.dispatchEvent(new Event('pointerdown'));

    sounds.hover(0);
    sounds.hover(1);

    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(1);
  });

  it('plays nothing while muted, and remembers the choice', async () => {
    const { isMuted, setMuted, sounds, unlockAudioOnFirstGesture } = await loadSound();
    unlockAudioOnFirstGesture();
    document.dispatchEvent(new Event('pointerdown'));

    setMuted(true);
    sounds.success();
    sounds.remove();

    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(0);
    expect((await loadSound()).isMuted()).toBe(true);

    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('does nothing in browsers without Web Audio', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const { sounds, unlockAudioOnFirstGesture } = await loadSound();

    expect(() => {
      unlockAudioOnFirstGesture();
      document.dispatchEvent(new Event('pointerdown'));
      sounds.open();
    }).not.toThrow();
  });
});
