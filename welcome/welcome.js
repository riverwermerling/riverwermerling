(function () {
  'use strict';

  const needsAccess = document.getElementById('needs-access');
  const ready = document.getElementById('ready');

  async function render() {
    const ok = await SteadyAccess.hasAccess();
    needsAccess.hidden = ok;
    ready.hidden = !ok;
  }

  document.getElementById('grant').addEventListener('click', async () => {
    await SteadyAccess.requestAccess();
    render();
  });

  render();
})();
