import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { setupPWAUpdater } from './utils/pwaUpdater';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Initialize PWA auto-update listener after render.
setupPWAUpdater();

