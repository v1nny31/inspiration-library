// Loaded once before every test file (see vite.config.js -> test.setupFiles).
// Adds the jest-dom matchers (toBeInTheDocument, toHaveValue, ...) to Vitest's `expect`.
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrolling; tests spy on this to check section jumps.
Element.prototype.scrollIntoView = function scrollIntoView() {};
