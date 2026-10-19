export function initializeTheme() {
  const toggle = document.getElementById('theme-toggle');
  const system = matchMedia('(prefers-color-scheme: dark)');
  let explicit = false;
  try { explicit = ['light', 'dark'].includes(localStorage.getItem('studyboss-theme')); } catch {}
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0d1222' : '#f5f6fb';
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Skift til lys tilstand' : 'Skift til mørk tilstand');
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '☀' : '☾';
    document.getElementById('theme-label').textContent = theme === 'dark' ? 'Lys' : 'Mørk';
  }
  apply(document.documentElement.dataset.theme || (system.matches ? 'dark' : 'light'));
  toggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    explicit = true; apply(theme);
    try { localStorage.setItem('studyboss-theme', theme); } catch {}
  });
  system.addEventListener('change', event => { if (!explicit) apply(event.matches ? 'dark' : 'light'); });
}
