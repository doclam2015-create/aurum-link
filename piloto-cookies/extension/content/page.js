/* Piloto de Cookies: se ejecuta en el contexto de la página.
 * - Señal Global Privacy Control (navigator.globalPrivacyControl).
 * - Usa las API oficiales de las plataformas de consentimiento cuando existen.
 * Se comunica con el script de contenido mediante eventos del documento. */
(function () {
  'use strict';
  const root = document.documentElement;
  if (!root || root.hasAttribute('data-pc-page')) return;
  root.setAttribute('data-pc-page', '1');

  let gpc = true;
  try {
    const desc = { configurable: true, enumerable: true, get: () => gpc };
    Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', desc);
  } catch (e) { /* algunos navegadores ya lo definen */ }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const call = (fn, ...a) => { try { return typeof fn === 'function' ? fn(...a) : undefined; } catch (e) { return undefined; } };

  const handlers = {
    async cookiebot(action, c) {
      const cb = window.Cookiebot || window.CookieConsent;
      if (!cb || typeof cb.submitCustomConsent !== 'function') return false;
      const v = action === 'accept' ? [true, true, true] : action === 'reject' ? [false, false, false] : [!!c.preferences, !!c.analytics, !!c.marketing];
      cb.submitCustomConsent(v[0], v[1], v[2]);
      call(cb.hide && cb.hide.bind(cb));
      return true;
    },
    async onetrust(action, c) {
      const ot = window.OneTrust;
      if (!ot) return false;
      if (action === 'reject' && typeof ot.RejectAll === 'function') { ot.RejectAll(); call(ot.Close && ot.Close.bind(ot)); return true; }
      if (action === 'accept' && typeof ot.AllowAll === 'function') { ot.AllowAll(); call(ot.Close && ot.Close.bind(ot)); return true; }
      if (action === 'custom' && typeof ot.UpdateConsent === 'function' && typeof ot.RejectAll === 'function') {
        ot.RejectAll();
        await wait(150);
        if (c.analytics) ot.UpdateConsent('Category', 'C0002:1');
        if (c.preferences) ot.UpdateConsent('Category', 'C0003:1');
        if (c.marketing) { ot.UpdateConsent('Category', 'C0004:1'); ot.UpdateConsent('Category', 'C0005:1'); }
        call(ot.Close && ot.Close.bind(ot));
        return true;
      }
      return false;
    },
    async didomi(action, c) {
      const d = window.Didomi;
      if (!d) return false;
      const agree = action === 'accept' || (action === 'custom' && c.marketing && c.analytics);
      if (agree && typeof d.setUserAgreeToAll === 'function') { d.setUserAgreeToAll(); return true; }
      if (!agree && typeof d.setUserDisagreeToAll === 'function') { d.setUserDisagreeToAll(); return true; }
      return false;
    },
    async usercentrics(action) {
      const v2 = window.UC_UI, v3 = window.__ucCmp;
      try {
        if (v3) {
          if (action === 'accept' && v3.acceptAllConsents) await v3.acceptAllConsents();
          else if (v3.denyAllConsents) await v3.denyAllConsents();
          else return false;
          if (v3.saveConsents) await v3.saveConsents();
          if (v3.closeCmp) await v3.closeCmp();
          return true;
        }
        if (v2) {
          if (action === 'accept' && v2.acceptAllConsents) await v2.acceptAllConsents();
          else if (v2.denyAllConsents) await v2.denyAllConsents();
          else return false;
          call(v2.closeCMP && v2.closeCMP.bind(v2));
          return true;
        }
      } catch (e) { return false; }
      return false;
    },
    async consentmanager(action) {
      if (typeof window.__cmp !== 'function') return false;
      window.__cmp('setConsent', action === 'accept' ? 1 : 0);
      return true;
    },
    async klaro(action) {
      const k = window.klaro;
      const m = k && call(k.getManager && k.getManager.bind(k));
      if (!m || typeof m.changeAll !== 'function') return false;
      m.changeAll(action === 'accept');
      call(m.saveAndApplyConsents && m.saveAndApplyConsents.bind(m));
      return true;
    }
  };

  document.addEventListener('pc:cfg', e => {
    try { const cfg = JSON.parse(e.detail); gpc = cfg.gpc !== false; } catch (err) { /* nada */ }
  });

  document.addEventListener('pc:cmd', async e => {
    let msg; try { msg = JSON.parse(e.detail); } catch (err) { return; }
    let ok = false;
    try {
      const h = handlers[msg.cmp];
      if (h) ok = !!(await h(msg.action, msg.cats || {}));
    } catch (err) { ok = false; }
    document.dispatchEvent(new CustomEvent('pc:res', { detail: JSON.stringify({ id: msg.id, ok }) }));
  });
})();
