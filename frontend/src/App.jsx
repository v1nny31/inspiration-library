import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SECTIONS } from './lib/sections';
import LibraryPage from './pages/LibraryPage';
import LinksPage from './pages/LinksPage';

const DEFAULT_PATH = `/${SECTIONS[0].id}`;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={DEFAULT_PATH} replace />} />
        {SECTIONS.map((section) => (
          // Keyed so switching tabs starts the page fresh (no data from the previous tab).
          <Route key={section.id} path={`/${section.id}`} element={<LibraryPage key={section.id} section={section.id} />} />
        ))}
        <Route path="/links" element={<LinksPage />} />
        <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
