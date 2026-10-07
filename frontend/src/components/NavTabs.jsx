import { NavLink } from 'react-router-dom';
import { SECTIONS } from '../lib/sections';
import { sounds } from '../lib/sound';

/** The top-level pages: one per library section, then the links. Each tab is a real URL. */
const TABS = [...SECTIONS.map((section) => ({ to: `/${section.id}`, label: section.label })), { to: '/links', label: 'Links' }];

export default function NavTabs() {
  return (
    <nav aria-label="Library sections" className="flex gap-6 border-b border-white/10">
      {TABS.map((tab, index) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          onClick={() => sounds.click()}
          onMouseEnter={() => sounds.hover(index + 3)}
          className={({ isActive }) =>
            `relative -mb-px pb-3 text-sm font-semibold transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {tab.label}
              {/* Underline grows in from the centre of the active tab. */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blurple shadow-glow-blurple transition-transform duration-300 ease-out ${
                  isActive ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
