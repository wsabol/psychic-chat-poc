import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { TranslationProvider } from './context/TranslationContext';

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
