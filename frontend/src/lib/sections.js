// The library's tabs. Each has its own categories, its own grid and its own
// folder in library/ (server/library.js reads this list too); these are the
// bits of wording and fields that differ.
export const SECTIONS = [
  {
    id: 'hero',
    label: 'Hero inspiration',
    item: 'screenshot',
    briefLabel: 'UI brief prompt',
    briefCopyLabel: 'Copy UI brief prompt',
    briefHint: 'For a coding agent: recreate this design language across a whole site or app.',
    briefPlaceholder: 'Describe the design language so a coding agent can rebuild a whole UI in this style.',
    // A hero visual only makes sense for full pages, not single components.
    hasHeroPrompt: true,
  },
  {
    id: 'components',
    label: 'Components',
    item: 'component',
    briefLabel: 'Component prompt',
    briefCopyLabel: 'Copy component prompt',
    briefHint: 'For a coding agent: rebuild this component in the same style.',
    briefPlaceholder: 'Describe the component (structure, states, styling) so a coding agent can rebuild it.',
    hasHeroPrompt: false,
  },
];

export function sectionConfig(id) {
  return SECTIONS.find((section) => section.id === id) ?? SECTIONS[0];
}
