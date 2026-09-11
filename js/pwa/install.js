const INSTALLED_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];

export function isInstalledApp(environment = globalThis) {
  if (environment.navigator?.standalone === true) return true;
  return INSTALLED_DISPLAY_MODES.some(mode => environment.matchMedia?.(`(display-mode: ${mode})`).matches);
}

export function setupInstallButton(button, environment = globalThis) {
  let installPrompt = null;
  const mediaQueries = INSTALLED_DISPLAY_MODES.map(mode => environment.matchMedia?.(`(display-mode: ${mode})`)).filter(Boolean);
  const hide = () => {
    button.hidden = true;
    installPrompt = null;
  };
  const updateVisibility = () => {
    if (isInstalledApp(environment)) hide();
  };

  environment.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (isInstalledApp(environment)) {
      hide();
      return;
    }
    installPrompt = event;
    button.hidden = false;
  });
  environment.addEventListener('appinstalled', hide);
  for (const query of mediaQueries) query.addEventListener?.('change', updateVisibility);
  button.addEventListener('click', async () => {
    if (!installPrompt || isInstalledApp(environment)) return hide();
    const promptEvent = installPrompt;
    installPrompt = null;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    hide();
  });
  updateVisibility();
}
