// Apply before styles load to avoid flashing the default palette on return visits.
(() => {
  const themes = [
    ['sky', 'Sky blue · Clear'],
    ['mint', 'Fresh mint · Calm'],
    ['lavender', 'Lavender · Dreamy'],
    ['peach', 'Peach · Warm'],
    ['rose', 'Rose · Cheerful']
  ];
  const translate = text => window.workbenchI18n ? window.workbenchI18n.t(text) : text;
  const key = 'workbench.theme';
  const valid = value => themes.some(([id]) => id === value);
  let selected = 'sky';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) selected = saved;
  } catch { /* Themes still work when browser storage is unavailable. */ }
  document.documentElement.dataset.theme = selected;

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.querySelector('#theme-select');
    const hint = document.querySelector('#theme-hint');
    for (const [id, name] of themes) {
      const option = document.createElement('option');
      option.value = id; option.textContent = translate(name); select.append(option);
    }
    select.value = selected;
    window.addEventListener('languagechange', () => {
      Array.from(select.options).forEach((option, index) => { option.textContent = translate(themes[index][1]); });
      hint.textContent = translate(hint.dataset.message || 'Choose a color for your mood.');
    });
    select.addEventListener('change', () => {
      if (!valid(select.value)) return;
      document.documentElement.dataset.theme = select.value;
      try {
        localStorage.setItem(key, select.value);
        hint.dataset.message = 'Saved in this browser.'; hint.textContent = translate('Saved in this browser.');
      } catch {
        hint.dataset.message = 'Applied for now. Browser storage is unavailable.'; hint.textContent = translate('Applied for now. Browser storage is unavailable.');
      }
    });
    window.addEventListener('storage', event => {
      if (event.key !== key && event.key !== null) return;
      const theme = valid(event.newValue) ? event.newValue : 'sky';
      document.documentElement.dataset.theme = theme;
      select.value = theme;
      hint.dataset.message = 'Choose a color for your mood.'; hint.textContent = translate('Choose a color for your mood.');
    });
  });
})();
