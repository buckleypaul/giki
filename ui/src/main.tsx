import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import App from './App.tsx'

// Load syntax highlighting theme based on data-highlight-theme attribute
function loadHighlightTheme() {
  const highlightTheme = document.documentElement.getAttribute('data-highlight-theme') || 'github';

  // Remove existing highlight.js stylesheet if any
  const existingLink = document.querySelector('link[data-hljs-theme]');
  if (existingLink) {
    existingLink.remove();
  }

  // Add new theme stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('data-hljs-theme', highlightTheme);
  link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${highlightTheme}.min.css`;
  document.head.appendChild(link);
}

// Load initial theme
loadHighlightTheme();

// Watch for highlight theme changes (set by ThemeContext)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-highlight-theme') {
      loadHighlightTheme();
    }
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-highlight-theme']
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
