import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ApiError } from '../api/client';
import { createLink, deleteLink, listLinks } from '../api/links';

vi.mock('../api/links', () => ({
  listLinks: vi.fn(),
  createLink: vi.fn(),
  deleteLink: vi.fn(),
}));

const godly = { id: 1, section: 'hero', url: 'https://godly.website', host: 'godly.website' };
const dribbble = { id: 2, section: 'hero', url: 'https://www.dribbble.com/shots', host: 'dribbble.com' };

function renderLinksPage() {
  window.history.pushState({}, '', '/links');
  render(<App />);
}

describe('LinksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listLinks.mockResolvedValue([godly, dribbble]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is its own tab with a heading per section', async () => {
    renderLinksPage();

    expect(screen.getByRole('link', { name: 'Links' })).toHaveAttribute('aria-current', 'page');
    const hero = screen.getByRole('region', { name: 'Hero inspiration' });
    const components = screen.getByRole('region', { name: 'Components' });

    expect(await within(hero).findByRole('link', { name: /godly\.website/ })).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: /dribbble\.com/ })).toBeInTheDocument();
    expect(await within(components).findByText('No links yet.')).toBeInTheDocument();
  });

  it('renders each link as a real link that opens in a new tab', async () => {
    renderLinksPage();

    const link = await screen.findByRole('link', { name: /dribbble\.com/ });
    expect(link).toHaveAttribute('href', 'https://www.dribbble.com/shots');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('adds a link to the chosen section', async () => {
    const user = userEvent.setup();
    const shadcn = { id: 3, section: 'components', url: 'https://ui.shadcn.com', host: 'ui.shadcn.com' };
    createLink.mockResolvedValue(shadcn);
    renderLinksPage();
    await screen.findByRole('link', { name: /godly\.website/ });

    await user.click(screen.getByRole('button', { name: '+ Add link' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a link' });
    // The section choices come from the library's tabs.
    expect(within(dialog).getAllByRole('option').map((option) => option.textContent)).toEqual(['Hero inspiration', 'Components']);

    listLinks.mockResolvedValue([godly, dribbble, shadcn]);
    await user.type(within(dialog).getByLabelText('Link'), 'https://ui.shadcn.com');
    await user.selectOptions(within(dialog).getByLabelText('Section'), 'components');
    await user.click(within(dialog).getByRole('button', { name: 'Add link' }));

    expect(createLink).toHaveBeenCalledWith({ url: 'https://ui.shadcn.com', section: 'components' });
    const components = screen.getByRole('region', { name: 'Components' });
    expect(await within(components).findByRole('link', { name: /ui\.shadcn\.com/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows why a link was rejected', async () => {
    const user = userEvent.setup();
    createLink.mockRejectedValue(
      new ApiError('This link is already in that section.', 422, { url: ['This link is already in that section.'] }),
    );
    renderLinksPage();

    await user.click(screen.getByRole('button', { name: '+ Add link' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a link' });
    await user.type(within(dialog).getByLabelText('Link'), 'https://godly.website');
    await user.click(within(dialog).getByRole('button', { name: 'Add link' }));

    expect(await within(dialog).findByText('This link is already in that section.')).toBeInTheDocument();
  });

  it('removes a link after confirming', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteLink.mockResolvedValue(null);
    renderLinksPage();
    await screen.findByRole('link', { name: /godly\.website/ });

    listLinks.mockResolvedValue([dribbble]);
    await user.click(screen.getByRole('button', { name: 'Remove link godly.website' }));

    expect(deleteLink).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.queryByRole('link', { name: /godly\.website/ })).not.toBeInTheDocument());
  });

  it('scrolls to a section from the side index', async () => {
    const user = userEvent.setup();
    const scrolledTo = [];
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function scrollIntoView() {
      scrolledTo.push(this.id);
    });
    renderLinksPage();

    const index = screen.getByRole('complementary', { name: 'Sections index' });
    await user.click(within(index).getByRole('button', { name: /^Components/ }));

    expect(scrolledTo).toEqual(['links-components']);
  });
});
