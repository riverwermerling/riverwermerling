// Opens the welcome page once, right after install. On Firefox and Safari
// that page is also where the user grants access to websites.
const api = globalThis.browser || globalThis.chrome;

api.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    api.tabs.create({ url: api.runtime.getURL('welcome/welcome.html') });
  }
});
