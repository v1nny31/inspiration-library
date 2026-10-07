import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEntranceAnimation } from './useEntranceAnimation';

// The played state lives for the whole page load, so each test uses its own key.
describe('useEntranceAnimation', () => {
  it('animates on the first mount only', () => {
    expect(renderHook(() => useEntranceAnimation('first-only')).result.current).toBe(true);
    expect(renderHook(() => useEntranceAnimation('first-only')).result.current).toBe(false);
  });

  it('keeps animating for the whole mount, even after re-rendering', () => {
    const { result, rerender } = renderHook(() => useEntranceAnimation('whole-mount'));
    rerender();

    expect(result.current).toBe(true);
  });

  it('waits until the part is shown before using up its animation', () => {
    const { result, rerender, unmount } = renderHook(({ shown }) => useEntranceAnimation('waits', shown), {
      initialProps: { shown: false },
    });
    expect(renderHook(() => useEntranceAnimation('waits', false)).result.current).toBe(true);

    rerender({ shown: true });
    expect(result.current).toBe(true);
    unmount();

    expect(renderHook(() => useEntranceAnimation('waits')).result.current).toBe(false);
  });

  it('tracks each part separately', () => {
    renderHook(() => useEntranceAnimation('part-a'));

    expect(renderHook(() => useEntranceAnimation('part-b')).result.current).toBe(true);
  });
});
