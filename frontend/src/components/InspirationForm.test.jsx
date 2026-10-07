import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCategory } from '../api/categories';
import { ApiError } from '../api/client';
import { createInspiration, updateInspiration } from '../api/inspirations';
import InspirationForm from './InspirationForm';

vi.mock('../api/categories', () => ({ createCategory: vi.fn() }));
vi.mock('../api/inspirations', () => ({
  createInspiration: vi.fn(),
  updateInspiration: vi.fn(),
}));

const categories = [
  { id: 1, name: 'Dashboard', inspirations_count: 3 },
  { id: 2, name: 'Landing Page', inspirations_count: 1 },
];

const screenshot = new File(['png-bytes'], 'shot.png', { type: 'image/png' });

function renderForm(props = {}) {
  const handlers = { onCategoryCreated: vi.fn(), onClose: vi.fn(), onSaved: vi.fn() };
  render(<InspirationForm section="hero" categories={categories} {...handlers} {...props} />);
  return handlers;
}

describe('InspirationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves a screenshot with its details, creating a new category on the way', async () => {
    const user = userEvent.setup();
    createCategory.mockResolvedValue({ id: 7, name: 'Pricing Page', inspirations_count: 0 });
    createInspiration.mockResolvedValue({ id: 99 });
    const { onSaved, onCategoryCreated } = renderForm();

    await user.upload(screen.getByLabelText('Screenshot file'), screenshot);
    await user.type(screen.getByLabelText('Name'), 'Calm pricing page');
    await user.type(screen.getByLabelText(/Website/), 'https://calm.example.com/pricing');
    await user.selectOptions(screen.getByLabelText('Category'), '__new');
    await user.type(screen.getByLabelText('New category name'), 'Pricing Page');
    await user.type(screen.getByLabelText('Tags'), 'Minimal{Enter}pastel,');
    await user.type(screen.getByLabelText('UI brief prompt'), 'Build a calm pricing page');
    await user.type(screen.getByLabelText('Hero image prompt'), 'Soft pastel shapes');
    await user.click(screen.getByRole('button', { name: 'Add to library' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 99 }));
    expect(createCategory).toHaveBeenCalledWith('Pricing Page', 'hero');
    expect(onCategoryCreated).toHaveBeenCalled();
    expect(createInspiration).toHaveBeenCalledWith({
      image: screenshot,
      section: 'hero',
      name: 'Calm pricing page',
      website_url: 'https://calm.example.com/pricing',
      category_id: 7,
      tags: ['minimal', 'pastel'],
      hero_prompt: 'Soft pastel shapes',
      brief_prompt: 'Build a calm pricing page',
    });
  });

  it('adds a component without a hero image prompt', async () => {
    const user = userEvent.setup();
    createCategory.mockResolvedValue({ id: 8, name: 'Pagination', inspirations_count: 0 });
    createInspiration.mockResolvedValue({ id: 50 });
    renderForm({ section: 'components', categories: [] });

    expect(screen.getByRole('heading', { name: 'Add a component' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Hero image prompt')).not.toBeInTheDocument();

    await user.upload(screen.getByLabelText('Screenshot file'), screenshot);
    await user.type(screen.getByLabelText('Name'), 'Numbered pagination');
    await user.selectOptions(screen.getByLabelText('Category'), '__new');
    await user.type(screen.getByLabelText('New category name'), 'Pagination');
    await user.type(screen.getByLabelText('Component prompt'), 'Build numbered pagination');
    await user.click(screen.getByRole('button', { name: 'Add to library' }));

    await waitFor(() => expect(createInspiration).toHaveBeenCalled());
    expect(createCategory).toHaveBeenCalledWith('Pagination', 'components');
    expect(createInspiration).toHaveBeenCalledWith({
      image: screenshot,
      section: 'components',
      name: 'Numbered pagination',
      website_url: '',
      category_id: 8,
      tags: [],
      brief_prompt: 'Build numbered pagination',
    });
  });

  it('reuses a category typed as new when it already exists', async () => {
    const user = userEvent.setup();
    createInspiration.mockResolvedValue({ id: 1 });
    renderForm();

    await user.upload(screen.getByLabelText('Screenshot file'), screenshot);
    await user.type(screen.getByLabelText('Name'), 'Something');
    await user.selectOptions(screen.getByLabelText('Category'), '__new');
    await user.type(screen.getByLabelText('New category name'), 'dashboard');
    await user.click(screen.getByRole('button', { name: 'Add to library' }));

    await waitFor(() => expect(createInspiration).toHaveBeenCalled());
    expect(createCategory).not.toHaveBeenCalled();
    expect(createInspiration.mock.calls[0][0].category_id).toBe(1);
  });

  it('needs an image and a name before it can be added', async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = screen.getByRole('button', { name: 'Add to library' });

    expect(submit).toBeDisabled();

    await user.upload(screen.getByLabelText('Screenshot file'), screenshot);
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Name'), 'Named');
    expect(submit).toBeEnabled();
  });

  it('accepts a screenshot pasted from the clipboard', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.paste({ files: [screenshot], items: [], types: ['Files'] });

    expect(await screen.findByRole('img', { name: 'Selected screenshot' })).toHaveAttribute('src', 'blob:preview');
  });

  it('shows validation errors next to their fields', async () => {
    const user = userEvent.setup();
    createInspiration.mockRejectedValue(
      new ApiError('The image field must be an image.', 422, { image: ['The image field must be an image.'] }),
    );
    renderForm();

    await user.upload(screen.getByLabelText('Screenshot file'), screenshot);
    await user.type(screen.getByLabelText('Name'), 'Named');
    await user.click(screen.getByRole('button', { name: 'Add to library' }));

    expect(await screen.findAllByText('The image field must be an image.')).toHaveLength(2);
  });

  it('edits the details of an existing inspiration without an image upload', async () => {
    const user = userEvent.setup();
    updateInspiration.mockResolvedValue({ id: 5, name: 'Renamed' });
    const existing = {
      id: 5,
      name: 'Old name',
      image_url: 'http://localhost:8000/storage/inspirations/a.png',
      website_url: 'https://old.example.com',
      tags: ['dark'],
      hero_prompt: 'hero',
      brief_prompt: 'brief',
      category: { id: 1, name: 'Dashboard' },
    };
    const { onSaved } = renderForm({ inspiration: existing });

    expect(screen.queryByLabelText('Screenshot file')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toHaveValue('1');
    expect(screen.getByLabelText(/Website/)).toHaveValue('https://old.example.com');

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Renamed');
    // Emptying the field removes the website.
    await user.clear(screen.getByLabelText(/Website/));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 5, name: 'Renamed' }));
    expect(updateInspiration).toHaveBeenCalledWith(5, {
      name: 'Renamed',
      website_url: '',
      category_id: 1,
      tags: ['dark'],
      hero_prompt: 'hero',
      brief_prompt: 'brief',
    });
  });
});
