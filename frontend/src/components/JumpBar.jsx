import { sounds } from '../lib/sound';
import { useEntranceAnimation } from '../lib/useEntranceAnimation';

const pill = 'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-out hover:px-6';
const activePill = 'bg-blurple text-white shadow-glow-blurple-sm hover:bg-blurple-hover';
const idlePill = 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white';

/**
 * Pills in the page header that scroll to a section of the page. A hovered
 * pill widens and plays its own note; the section in view is highlighted.
 */
export default function JumpBar({ label, items, activeId, onJump }) {
  // The pills arrive after the page's data loads, so they only count as shown once there are some.
  const animate = useEntranceAnimation('jump-bar', items.length > 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label={label}>
      {/* Vertical padding leaves room for the glow inside the scroll container. */}
      <ul className={`${animate ? 'stagger' : ''} -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-2`}>
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  onJump(item.id);
                }}
                onMouseEnter={() => sounds.hover(index)}
                aria-current={active ? 'location' : undefined}
                className={`${pill} ${active ? activePill : idlePill}`}
              >
                {item.label}
                <span className={`ml-2 text-xs ${active ? 'text-white/70' : 'text-zinc-500'}`}>{item.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
