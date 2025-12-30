import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { TranslationProvider } from './context/TranslationContext';

// Suppress ResizeObserver loop errors (browser-level timing, not code error)
const origError = console.error;
console.error = function(...args) {
  if (args[0]?.includes?.('ResizeObserver loop completed')) return;
  origError.apply(console, args);
};

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
