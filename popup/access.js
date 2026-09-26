// Site access. Chromium browsers grant it at install. Firefox and Safari let
// the user hold it back, and without it the extension silently does nothing,
// so we check and offer a one-click fix.
(function (root) {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const ALL_SITES = { origins: ['<all_urls>'] };

  async function hasAccess() {
    try {
      return await api.permissions.contains(ALL_SITES);
    } catch (e) {
      return true; // browser can't tell us; assume the manifest grant held
    }
  }

  // Must be called from a click handler: browsers only show the prompt in
  // response to a user action.
  async function requestAccess() {
    try {
      return await api.permissions.request(ALL_SITES);
    } catch (e) {
      return false;
    }
  }

  root.SteadyAccess = { hasAccess, requestAccess };
})(globalThis);
