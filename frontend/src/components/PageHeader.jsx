import { useEffect, useRef } from 'react';
import { useEntranceAnimation } from '../lib/useEntranceAnimation';
import NavTabs from './NavTabs';
import SoundToggle from './SoundToggle';

/**
 * The sticky top of every page: title, sound toggle, the page's main `action`
 * button, the page tabs, and an optional page-specific toolbar below them.
 * Publishes its height as the --header-h CSS variable so side indexes and
 * section jumps can sit just below it.
 */
export default function PageHeader({ action, children }) {
  const headerRef = useRef(null);
  const animate = useEntranceAnimation('page-header');

  useEffect(() => {
    const header = headerRef.current;
    const publish = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur-lg">
      <div className={`${animate ? 'stagger' : ''} mx-auto flex max-w-[110rem] flex-col gap-4 px-4 py-5 sm:px-8`}>
        <div className={`${animate ? 'stagger' : ''} flex items-center justify-between gap-4`}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Inspiration Library</h1>
            <p className="text-sm text-zinc-500">UI screenshots and prompts to feed your agents.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SoundToggle />
            {action}
          </div>
        </div>

        <NavTabs />

        {children}
      </div>
    </header>
  );
}
