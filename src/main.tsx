import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/josefin-sans/300.css';
import '@fontsource/josefin-sans/400.css';
import '@fontsource/josefin-sans/500.css';
import '@fontsource/josefin-sans/600.css';
import '@fontsource/josefin-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initMonitoring, captureException } from './lib/monitoring';
import { logger } from './lib/logger';

initMonitoring();

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason);
  captureException(event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // registration failed — app still works offline via cache
    });
  });
}
