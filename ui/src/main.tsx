import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import App from './App.tsx'

// Load syntax highlighting theme based on current theme
function loadHighlightTheme() {
  const theme = document.documentElement.getAttribute('data-theme') ||
                (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // Remove existing highlight.js stylesheet if any
  const existingLink = document.querySelector('link[data-highlight-theme]');
  if (existingLink) {
    existingLink.remove();
  }

  // Add new theme stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('data-highlight-theme', 'true');
  link.href = theme === 'dark'
    ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
    : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
  document.head.appendChild(link);
}

// Load initial theme
loadHighlightTheme();

// Watch for theme changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
      loadHighlightTheme();
    }
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
