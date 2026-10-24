/* Photos app view: wires PhotosPage (photos.js) to this page and to the shell's Photos relay. */
(() => {
  'use strict';
  const P = window.PhotosPage, root = document.getElementById('root');
  const inShell = window.parent && window.parent !== window;
  if (inShell) document.documentElement.classList.add('framed');
  const st = { mode: '', status: null, error: '', busy: false, server: '', albumsOpen: false, albums: null, albumsError: '', confirmDisconnect: false };
  const post = msg => { if (!inShell) throw Object.assign(new Error('no-bridge'), { code: 'no-bridge' }); window.parent.postMessage(msg, location.origin); };
  const api = P.client(post, { onStatus: s => { st.status = s; if (st.mode !== 'v1') st.mode = 'v1'; render(); }, onResume: () => { if (st.mode === 'v1') api.status().catch(() => {}); } });
  window.addEventListener('message', ev => { if (ev.origin === location.origin && ev.source === window.parent) api.onMessage(ev.data); });

  function render() {
    // Typing the server address: only the status line changes, so the field keeps its caret.
    if (document.activeElement?.matches?.('[data-ph-server]')) {
      root.querySelectorAll('[data-ph-status]').forEach(el => { el.textContent = st.error || P.summary(st.status); }); return;
    }
    root.innerHTML = st.mode ? P.html(st) : '<p class="ph-status">Checking…</p>';
  }
  function tap(what, extra = {}) {
    if (st.mode === 'legacy') { if (what === 'native') api.openNative().catch(() => { st.error = 'Update Wizard OS to back up photos'; render(); }); return; }
    st.error = '';
    const pending = P.act(st, api, what, extra);
    if (!pending) { render(); return; }
    if (what !== 'albums' && what !== 'album') st.busy = true;
    render();
    pending.catch(e => { st.error = e.timeout ? 'The Wizard OS app did not answer · try again' : e.message; }).finally(() => { st.busy = false; render(); });
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-ph], [data-ph-album]'); if (!b || b.disabled) return;
    if (b.dataset.phAlbum != null) { tap('album', { id: b.dataset.phAlbum }); return; }
    const field = root.querySelector('[data-ph-server]');
    tap(b.dataset.ph, field ? { server: field.value } : {});
  });
  root.addEventListener('input', e => { if (e.target.matches('[data-ph-server]')) st.server = e.target.value; });

  // The shell's Back: close the album list first; at the root answer false so Wizard OS takes its own step.
  if (window.WizardApp) {
    WizardApp.ready({ name: 'Photos', version: '1' });
    WizardApp.back?.register?.({ canGoBack: () => st.albumsOpen || st.confirmDisconnect, back: () => { st.albumsOpen = false; st.confirmDisconnect = false; render(); return true; } });
  }

  P.detect(api).then(mode => {
    st.mode = mode === 'v1-error' ? 'v1' : mode;
    if (mode === 'v1-error') st.error = 'Could not read backup status · try again';
    render();
  });
  render();
})();
