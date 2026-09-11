import assert from 'node:assert/strict';
import {isInstalledApp, setupInstallButton} from '../js/pwa/install.js';

function createEnvironment(activeMode) {
  const handlers = {};
  const queries = new Map();
  const environment = {
    navigator: {},
    addEventListener: (type, handler) => { handlers[type] = handler; },
    matchMedia: query => {
      const mode = query.match(/display-mode: ([^)]+)/)[1];
      const media = {matches: mode === activeMode, addEventListener: (type, handler) => { media[type] = handler; }};
      queries.set(mode, media);
      return media;
    }
  };
  return {environment, handlers, queries};
}

assert.equal(isInstalledApp(createEnvironment('standalone').environment), true);
assert.equal(isInstalledApp(createEnvironment().environment), false);
const ios = createEnvironment();
ios.environment.navigator.standalone = true;
assert.equal(isInstalledApp(ios.environment), true);

const installed = createEnvironment('standalone');
const installedButton = {hidden: true, addEventListener: (type, handler) => { installedButton[type] = handler; }};
setupInstallButton(installedButton, installed.environment);
installed.handlers.beforeinstallprompt({preventDefault() {}});
assert.equal(installedButton.hidden, true, 'install button must remain hidden in an installed app');

const browser = createEnvironment();
const browserButton = {hidden: true, addEventListener: (type, handler) => { browserButton[type] = handler; }};
setupInstallButton(browserButton, browser.environment);
browser.handlers.beforeinstallprompt({preventDefault() {}, prompt: async () => {}, userChoice: Promise.resolve({outcome: 'accepted'})});
assert.equal(browserButton.hidden, false, 'install button should be offered in a browser');
browser.handlers.appinstalled();
assert.equal(browserButton.hidden, true, 'install button should disappear after installation');

console.log('PWA installed-display-mode scenarios passed.');
