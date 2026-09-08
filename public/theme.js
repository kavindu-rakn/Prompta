// Anti-FOUC theme bootstrap. Runs before React mounts and before first paint,
// so the correct theme is on <html> from the very first frame.
//
// This lives in a separate file rather than inline in layout.tsx so that the
// Content-Security-Policy does not need a hash or a nonce for it.
try {
  var theme = localStorage.getItem('prompta-theme');
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
} catch (e) {}
