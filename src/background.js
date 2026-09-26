/*
 * Steady Volume — background.
 *
 * - Opens the welcome page once, right after install.
 * - Chrome and Edge only: runs "tab mode" for copy-protected sites by
 *   managing the hidden offscreen page that processes a captured tab.
 */
const api = globalThis.browser || globalThis.chrome;

api.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    api.tabs.create({ url: api.runtime.getURL('welcome/welcome.html') });
  }
});

if (api.offscreen && api.tabCapture) {
  const OFFSCREEN_URL = 'src/offscreen.html';
  let creating = null;

  async function hasOffscreen() {
    const contexts = await api.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return contexts.length > 0;
  }

  async function ensureOffscreen() {
    if (await hasOffscreen()) return;
    if (!creating) {
      creating = api.offscreen.createDocument({
        url: OFFSCREEN_URL,
        reasons: ['USER_MEDIA'],
        justification: 'Evens out the volume of a tab the user switched on.',
      }).finally(() => { creating = null; });
    }
    await creating;
  }

  const toOffscreen = (msg) => api.runtime.sendMessage({ target: 'offscreen', ...msg });

  async function stopTab(tabId) {
    if (!(await hasOffscreen())) return;
    const res = await toOffscreen({ type: 'stop', tabId });
    if (res && res.remaining === 0) await api.offscreen.closeDocument().catch(() => {});
  }

  async function handle(msg, sender) {
    switch (msg.type) {
      // A page asking whether its tab is already in tab mode (e.g. after
      // navigating), so it doesn't process the sound a second time.
      case 'tab:am-i-captured': {
        if (!sender.tab || !(await hasOffscreen())) return { active: false };
        const res = await toOffscreen({ type: 'status', tabId: sender.tab.id });
        return { active: !!(res && res.active) };
      }
      case 'tab:start': {
        await ensureOffscreen();
        const settings = await api.storage.sync.get({ enabled: true, preset: 'balanced' });
        return toOffscreen({ type: 'start', tabId: msg.tabId, streamId: msg.streamId, settings });
      }
      case 'tab:stop':
        await stopTab(msg.tabId);
        return { ok: true };
      case 'tab:status':
        if (!(await hasOffscreen())) return { active: false, meter: null };
        return toOffscreen({ type: 'status', tabId: msg.tabId });
      case 'tab:ended':
        await stopTab(msg.tabId);
        return { ok: true };
    }
    return undefined;
  }

  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.target !== 'background') return;
    handle(msg, sender).then(sendResponse, (e) => sendResponse({ ok: false, error: String(e && e.message || e) }));
    return true;
  });

  api.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'sync' || !(await hasOffscreen())) return;
    const settings = await api.storage.sync.get({ enabled: true, preset: 'balanced' });
    toOffscreen({ type: 'settings', settings }).catch(() => {});
  });

  api.tabs.onRemoved.addListener((tabId) => {
    stopTab(tabId).catch(() => {});
  });
}
