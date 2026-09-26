(function () {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const power = document.getElementById('power');
  const powerState = document.getElementById('power-state');
  const powerHint = document.getElementById('power-hint');
  const presets = document.getElementById('presets');
  const status = document.getElementById('status');

  const settings = { enabled: true, preset: 'balanced' };

  function render() {
    power.setAttribute('aria-checked', String(settings.enabled));
    powerState.textContent = settings.enabled ? 'On' : 'Off';
    powerHint.textContent = settings.enabled
      ? 'Whispers and explosions kept at one level'
      : 'Sound plays exactly as the film was mixed';
    presets.disabled = !settings.enabled;
    const radio = presets.querySelector(`input[value="${settings.preset}"]`);
    if (radio) radio.checked = true;
  }

  power.addEventListener('click', () => {
    settings.enabled = !settings.enabled;
    api.storage.sync.set({ enabled: settings.enabled });
    render();
    refreshStatus();
  });

  presets.addEventListener('change', (e) => {
    settings.preset = e.target.value;
    api.storage.sync.set({ preset: settings.preset });
  });

  async function refreshStatus() {
    if (!settings.enabled) {
      status.textContent = '';
      return;
    }
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      const s = await api.tabs.sendMessage(tab.id, { type: 'steady:status' });
      if (s.active > 0) {
        status.textContent = s.active === 1
          ? 'Working on the video on this page.'
          : `Working on ${s.active} videos on this page.`;
      } else if (s.waiting > 0) {
        status.textContent = 'Click anywhere on the page to start.';
      } else if (s.skipped > 0) {
        status.textContent = 'This site’s player can’t be adjusted.';
      } else {
        status.textContent = 'Ready. Starts automatically when a video plays.';
      }
    } catch (e) {
      // Browser pages, the web store, or a tab opened before install.
      status.textContent = 'Ready. Reload the page if a video is already playing.';
    }
  }

  api.storage.sync.get(settings).then((stored) => {
    Object.assign(settings, stored);
    render();
    refreshStatus();
  });
})();
