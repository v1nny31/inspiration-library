import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createCategory, deleteCategory, listCategories } from './api/categories';
import { ApiError } from './api/client';
import { listInspirations } from './api/inspirations';

vi.mock('./api/categories', () => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock('./api/inspirations', () => ({
  listInspirations: vi.fn(),
  deleteInspiration: vi.fn(),
  createInspiration: vi.fn(),
  updateInspiration: vi.fn(),
}));

const dashboard = { id: 'dashboard', section: 'hero', name: 'Dashboard', inspirations_count: 1 };
const landing = { id: 'landing-page', section: 'hero', name: 'Landing Page', inspirations_count: 1 };
const buttons = { id: 'buttons', section: 'components', name: 'Buttons', inspirations_count: 1 };

const neon = {
  id: 'neon-analytics-a1b2c3',
  section: 'hero',
  name: 'Neon analytics',
  image_url: '/library/hero/neon-analytics-a1b2c3/screenshot.png',
  website_url: 'https://neon.example.com',
  tags: ['dark mode', 'charts'],
  hero_prompt: 'A glowing data landscape',
  brief_prompt: 'Build a dark dashboard',
  category: { id: 'dashboard', name: 'Dashboard' },
};

const saas = {
  id: 'calm-saas-landing-d4e5f6',
  section: 'hero',
  name: 'Calm SaaS landing',
  image_url: '/library/hero/calm-saas-landing-d4e5f6/screenshot.png',
  website_url: null,
  tags: [],
  hero_prompt: null,
  brief_prompt: 'Build a calm landing page',
  category: { id: 'landing-page', name: 'Landing Page' },
};

const pillButton = {
  id: 'glowing-pill-button-0a1b2c',
  section: 'components',
  name: 'Glowing pill button',
  image_url: '/library/components/glowing-pill-button-0a1b2c/screenshot.png',
  tags: ['rounded'],
  hero_prompt: null,
  brief_prompt: 'Build a glowing pill button',
  category: { id: 'buttons', name: 'Buttons' },
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // BrowserRouter reads the real (jsdom) URL; start every test from the root.
    window.history.pushState({}, '', '/');
    listCategories.mockImplementation(async (section) => [dashboard, landing, buttons].filter((c) => c.section === section));
    listInspirations.mockImplementation(async (section, categoryId) =>
      [neon, saas, pillButton].filter((i) => i.section === section && (!categoryId || i.category.id === categoryId)),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the hero tab by default', async () => {
    render(<App />);

    await screen.findByRole('button', { name: /Neon analytics/ });
    expect(window.location.pathname).toBe('/hero');
    expect(screen.getByRole('link', { name: 'Hero inspiration' })).toHaveAttribute('aria-current', 'page');
  });

  it('switches to the components tab, with its own URL, categories and grid', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: /Neon analytics/ });

    await user.click(screen.getByRole('link', { name: 'Components' }));

    expect(await screen.findByRole('button', { name: /Glowing pill button/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/components');
    expect(screen.queryByRole('button', { name: /Neon analytics/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Components' })).toHaveAttribute('aria-current', 'page');
    const categories = screen.getByRole('navigation', { name: 'Categories' });
    expect(await within(categories).findByRole('button', { name: /^Buttons/ })).toBeInTheDocument();
    expect(within(categories).queryByRole('button', { name: /^Dashboard/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add component' })).toBeInTheDocument();
    expect(listInspirations).toHaveBeenLastCalledWith('components');
  });

  it('does not replay the header entrance animation when switching tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: /Neon analytics/ });

    await user.click(screen.getByRole('link', { name: 'Components' }));
    await screen.findByRole('button', { name: /Glowing pill button/ });

    const header = screen.getByRole('heading', { name: 'Inspiration Library' }).closest('header');
    expect(header.querySelector('.stagger')).toBeNull();
  });

  it('opens a tab straight from its URL', async () => {
    window.history.pushState({}, '', '/components');
    render(<App />);

    expect(await screen.findByRole('button', { name: /Glowing pill button/ })).toBeInTheDocument();
    expect(listCategories).toHaveBeenCalledWith('components');
  });

  it('sends unknown URLs back to the hero tab', async () => {
    window.history.pushState({}, '', '/nope');
    render(<App />);

    await screen.findByRole('button', { name: /Neon analytics/ });
    expect(window.location.pathname).toBe('/hero');
  });

  it('shows only the component prompt for a component', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/components');
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Glowing pill button/ }));
    const dialog = screen.getByRole('dialog', { name: 'Glowing pill button' });

    expect(within(dialog).getByRole('button', { name: 'Copy component prompt' })).toBeEnabled();
    expect(within(dialog).queryByRole('button', { name: 'Copy hero image prompt' })).not.toBeInTheDocument();
  });

  it('shows every screenshot as a card with its name, category and tags', async () => {
    render(<App />);

    const card = await screen.findByRole('button', { name: /Neon analytics/ });
    expect(within(card).getByRole('img', { name: 'Neon analytics' })).toHaveAttribute('src', neon.image_url);
    expect(within(card).getByText('Dashboard')).toBeInTheDocument();
    expect(within(card).getByText('dark mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Calm SaaS landing/ })).toBeInTheDocument();
  });

  it('groups the screenshots under a heading per category', async () => {
    render(<App />);

    const dashboardSection = await screen.findByRole('region', { name: 'Dashboard' });
    const landingSection = screen.getByRole('region', { name: 'Landing Page' });
    expect(within(dashboardSection).getByRole('button', { name: /Neon analytics/ })).toBeInTheDocument();
    expect(within(landingSection).getByRole('button', { name: /Calm SaaS landing/ })).toBeInTheDocument();
    expect(within(dashboardSection).queryByRole('button', { name: /Calm SaaS landing/ })).not.toBeInTheDocument();
    expect(listInspirations).toHaveBeenCalledWith('hero');
  });

  it('collects screenshots without a category under "Uncategorized"', async () => {
    const orphan = { ...saas, id: 'orphan-hero-3d4e5f', name: 'Orphan hero', category: null };
    listInspirations.mockResolvedValue([neon, orphan]);
    render(<App />);

    const uncategorized = await screen.findByRole('region', { name: 'Uncategorized' });
    expect(within(uncategorized).getByRole('button', { name: /Orphan hero/ })).toBeInTheDocument();
  });

  it('keeps empty categories on the page with a placeholder', async () => {
    listCategories.mockResolvedValue([dashboard, { id: 'mobile', section: 'hero', name: 'Mobile', inspirations_count: 0 }]);
    render(<App />);

    const mobile = await screen.findByRole('region', { name: 'Mobile' });
    expect(within(mobile).getByText('No screenshots in this category yet.')).toBeInTheDocument();
  });

  it('scrolls to a category from the side index and from the header pills', async () => {
    const user = userEvent.setup();
    const scrolledTo = [];
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function scrollIntoView() {
      scrolledTo.push(this.id);
    });
    render(<App />);
    await screen.findByRole('region', { name: 'Landing Page' });

    const index = screen.getByRole('complementary', { name: 'Categories index' });
    await user.click(within(index).getByRole('button', { name: /^Landing Page/ }));
    expect(scrolledTo).toEqual(['category-landing-page']);
    expect(within(index).getByRole('button', { name: /^Landing Page/ })).toHaveAttribute('aria-current', 'location');

    const pills = screen.getByRole('navigation', { name: 'Categories' });
    await user.click(within(pills).getByRole('button', { name: /^Dashboard/ }));
    expect(scrolledTo).toEqual(['category-landing-page', 'category-dashboard']);
    // Jumping never filters: every screenshot stays on the page.
    expect(screen.getByRole('button', { name: /Calm SaaS landing/ })).toBeInTheDocument();
  });

  it('shows a placeholder in the index when there are no categories, and adds one from the plus button', async () => {
    const user = userEvent.setup();
    listCategories.mockResolvedValue([]);
    listInspirations.mockResolvedValue([]);
    createCategory.mockResolvedValue({ id: 'footers', section: 'hero', name: 'Footers', inspirations_count: 0 });
    render(<App />);

    const index = screen.getByRole('complementary', { name: 'Categories index' });
    expect(await within(index).findByText('No categories yet')).toBeInTheDocument();

    listCategories.mockResolvedValue([{ id: 'footers', section: 'hero', name: 'Footers', inspirations_count: 0 }]);
    await user.click(within(index).getByRole('button', { name: 'Add category' }));
    await user.type(within(index).getByRole('textbox', { name: 'New category name' }), 'Footers{Enter}');

    expect(createCategory).toHaveBeenCalledWith('Footers', 'hero');
    expect(await within(index).findByRole('button', { name: /^Footers/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Footers' })).toBeInTheDocument();
  });

  it('shows why a new category was rejected', async () => {
    const user = userEvent.setup();
    createCategory.mockRejectedValue(
      new ApiError('The name has already been taken.', 422, { name: ['The name has already been taken.'] }),
    );
    render(<App />);
    const index = screen.getByRole('complementary', { name: 'Categories index' });
    await within(index).findByRole('button', { name: /^Dashboard/ });

    await user.click(within(index).getByRole('button', { name: 'Add category' }));
    await user.type(within(index).getByRole('textbox', { name: 'New category name' }), 'Dashboard{Enter}');

    expect(await within(index).findByText('The name has already been taken.')).toBeInTheDocument();
  });

  it('deletes a category from the index after confirming', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteCategory.mockResolvedValue(null);
    render(<App />);
    const index = screen.getByRole('complementary', { name: 'Categories index' });
    await within(index).findByRole('button', { name: /^Dashboard/ });

    await user.click(within(index).getByRole('button', { name: 'Delete category Dashboard' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Its 1 screenshot will stay in the library'));
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('hero', 'dashboard'));
  });

  it('opens a popup with the details and copies each prompt', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Neon analytics/ }));
    const dialog = screen.getByRole('dialog', { name: 'Neon analytics' });

    // The prompts are only reachable through the copy buttons.
    expect(within(dialog).queryByText('Build a dark dashboard')).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Copy UI brief prompt' }));
    expect(writeText).toHaveBeenLastCalledWith('Build a dark dashboard');
    expect(within(dialog).getByRole('button', { name: 'Copied!' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Copy hero image prompt' }));
    expect(writeText).toHaveBeenLastCalledWith('A glowing data landscape');
  });

  it('links to the website a screenshot came from, when it has one', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Neon analytics/ }));
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: /Visit website/ })).toHaveAttribute(
      'href',
      'https://neon.example.com',
    );

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /Calm SaaS landing/ }));
    expect(within(screen.getByRole('dialog')).queryByRole('link', { name: /Visit website/ })).not.toBeInTheDocument();
  });

  it('disables a copy button when that prompt is empty', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Calm SaaS landing/ }));

    expect(screen.getByRole('button', { name: 'Copy hero image prompt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy UI brief prompt' })).toBeEnabled();
  });

  it('closes the popup with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Neon analytics/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('turns the sounds off and on, remembering the choice', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Turn sounds off' }));
    expect(localStorage.getItem('inspiration-library:sound-muted')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Turn sounds on' }));
    expect(localStorage.getItem('inspiration-library:sound-muted')).toBe('false');
  });
});
