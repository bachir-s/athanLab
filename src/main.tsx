import 'whatwg-fetch'; // fetch absent de Safari < 10.1 (iPad 2 / iOS 9)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';

// `gap` sur flexbox n'existe pas avant Safari 14.1 : on le détecte pour
// activer des marges de repli (voir legacyCss dans vite.config.ts).
function supportsFlexGap(): boolean {
  const el = document.createElement('div');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.rowGap = '1px';
  el.appendChild(document.createElement('div'));
  el.appendChild(document.createElement('div'));
  document.body.appendChild(el);
  const ok = el.scrollHeight === 1;
  document.body.removeChild(el);
  return ok;
}
if (!supportsFlexGap()) document.documentElement.className += ' no-flexgap';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
