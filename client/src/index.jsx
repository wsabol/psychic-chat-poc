import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { TranslationProvider } from './context/TranslationContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// ---- Real viewport height fix (Samsung Internet / Brave / mobile browsers) ----
// Samsung Internet's bottom navigation bar sits *inside* the layout viewport,
// so `100vh` includes the area behind that bar.  window.visualViewport.height
// returns the actual *visible* height (toolbars excluded) on every browser that
// supports the VisualViewport API (Samsung Internet 11+, Chrome 61+, Safari 13+).
// We store this as --real-100vh so CSS can use it instead of 100vh.
// The CSS layer seeds the variable with 100dvh so pages look correct before
// the first JS paint (100dvh is understood by Samsung Internet 20+).
function updateRealVh() {
  const h = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;
  document.documentElement.style.setProperty('--real-100vh', h + 'px');
}
updateRealVh();
window.addEventListener('resize', updateRealVh);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateRealVh);
}

// Suppress ResizeObserver loop errors (browser-level timing, not code error).
// Two guards are needed:
//  1. console.error patch  — stops it appearing in the console
//  2. window 'error' listener — stops the CRA dev-overlay from showing it as a
//     fatal "Uncaught runtime error" (the overlay hooks into the global error event)
const origError = console.error;
console.error = function(...args) {
  if (args[0]?.includes?.('ResizeObserver loop completed')) return;
  origError.apply(console, args);
};

window.addEventListener('error', (event) => {
  if (event?.message?.includes('ResizeObserver loop completed')) {
    // Prevent the event from reaching the CRA error overlay handler
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true /* capture phase — runs before the overlay's listener */);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <TranslationProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TranslationProvider>
    </Router>
  </React.StrictMode>
);

serviceWorkerRegistration.register();
