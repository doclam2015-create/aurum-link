/* Piloto de Cookies: motor que detecta y responde los avisos de cookies. */
(function () {
  'use strict';
  if (window.__pcEngine) return;
  window.__pcEngine = true;

  const PC = globalThis.PC;
  const api = PC.api;
  const RULES = globalThis.PC_RULES || [];
  const WORDS = globalThis.PC_WORDS;
  const TOP = window.top === window;
  const HOST = location.hostname.replace(/^www\./, '');
  const T0 = performance.now();

  let settings = null;
  let eff = null;
  let done = false;          // ya se respondió un aviso en este marco
  let attempts = {};         // id de regla → intentos
  let observer = null;
  let scanTimer = 0;
  let prehideEl = null;
  let userHideEl = null;
  let handledBanner = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ——— Página: inyección del script en el contexto de la página ———
  function injectPage() {
    if (document.documentElement && document.documentElement.hasAttribute('data-pc-page')) return;
    try {
      const s = document.createElement('script');
      s.src = api.runtime.getURL('content/page.js');
      s.async = false;
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* CSP estricta: se usan sólo clics */ }
  }

  let reqId = 0;
  function pageCall(cmp, action, cats, timeout) {
    return new Promise(resolve => {
      const id = 'r' + (++reqId) + Math.random().toString(36).slice(2, 6);
      const onRes = e => {
        let d; try { d = JSON.parse(e.detail); } catch (err) { return; }
        if (d.id !== id) return;
        document.removeEventListener('pc:res', onRes);
        clearTimeout(tm);
        resolve(!!d.ok);
      };
      const tm = setTimeout(() => { document.removeEventListener('pc:res', onRes); resolve(false); }, timeout || 1200);
      document.addEventListener('pc:res', onRes);
      document.dispatchEvent(new CustomEvent('pc:cmd', { detail: JSON.stringify({ id, cmp, action, cats }) }));
    });
  }

  // ——— DOM: búsqueda que también entra en shadow roots ———
  function roots() {
    const out = [document];
    const hosts = document.querySelectorAll('#usercentrics-root, #usercentrics-cmp-ui, #cmpwrapper, #lanyard_root, [id*="consent" i], [id*="cookie" i], [class*="consent" i]');
    hosts.forEach(h => { if (h.shadowRoot) out.push(h.shadowRoot); });
    if (document.body) for (const c of document.body.children) if (c.shadowRoot && !out.includes(c.shadowRoot)) out.push(c.shadowRoot);
    return out;
  }
  function qsa(sel) {
    const out = [];
    for (const r of roots()) { try { r.querySelectorAll(sel).forEach(e => out.push(e)); } catch (e) { /* selector inválido */ } }
    return out;
  }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  function firstVisible(sel) { return qsa(sel).find(visible) || null; }
  async function waitFor(sel, timeout) {
    const end = performance.now() + (timeout || 2000);
    do {
      const el = firstVisible(sel) || qsa(sel)[0];
      if (el) return el;
      await sleep(100);
    } while (performance.now() < end);
    return null;
  }
  function clickEl(el) {
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(t => {
      try { el.dispatchEvent(new (t.startsWith('pointer') && window.PointerEvent ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, view: window })); } catch (e) { /* nada */ }
    });
    el.click();
  }
  function setToggle(el, on) {
    if (el.matches('input[type="checkbox"], input[type="radio"]')) {
      if (el.disabled) return;
      if (el.checked !== on) el.click();
      if (el.checked !== on) { el.checked = on; el.dispatchEvent(new Event('change', { bubbles: true })); }
      return;
    }
    const cur = el.getAttribute('aria-checked') ?? el.getAttribute('aria-pressed');
    if (cur !== null && (cur === 'true') !== on) el.click();
  }

  async function runSteps(steps, rule, stopIfGone) {
    let clicked = false;
    for (const s of steps) {
      if (s.onlyIfVisible && !firstVisible(s.onlyIfVisible)) continue;
      if (s.sleep) await sleep(s.sleep);
      if (s.wait) {
        const w = await waitFor(s.wait, s.timeout || 1500);
        if (!w && !s.optional) return clicked;
      }
      if (s.toggle) { qsa(s.toggle).forEach(el => setToggle(el, s.on)); await sleep(60); }
      if (s.click) {
        const el = await waitFor(s.click, s.timeout || 1800);
        if (!el) { if (s.optional) continue; return clicked; }
        clickEl(el);
        clicked = true;
        await sleep(s.delay || 250);
        if (stopIfGone && !firstVisible(rule.detect)) return true;
      }
    }
    return clicked;
  }

  // ——— Ocultamiento ———
  function addStyle(css, id) {
    const st = document.createElement('style');
    st.id = id;
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
    return st;
  }
  function prehide() {
    const sels = RULES.filter(r => r.prehide && (!r.host || r.host.test(HOST))).map(r => r.prehide).join(',');
    prehideEl = addStyle(sels + '{opacity:0!important;pointer-events:none!important;transition:none!important}', 'pc-prehide');
  }
  function unprehide() { if (prehideEl) { prehideEl.remove(); prehideEl = null; } }
  function applyUserHide() {
    const list = PC.hideRulesFor(settings, HOST);
    if (userHideEl) userHideEl.remove();
    userHideEl = list.length ? addStyle(list.join(',') + '{display:none!important}', 'pc-userhide') : null;
  }
  function hideElement(el) {
    el.setAttribute('data-pc-hidden', '1');
    el.style.setProperty('display', 'none', 'important');
  }

  function restoreScroll() {
    if (!settings.restoreScroll) return;
    setTimeout(() => {
      for (const el of [document.documentElement, document.body]) {
        if (!el) continue;
        const cs = getComputedStyle(el);
        if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') el.style.setProperty('overflow', 'auto', 'important');
        if (el === document.body && cs.position === 'fixed') { el.style.setProperty('position', 'static', 'important'); }
      }
      ['ot-overflow-hidden', 'didomi-popup-open', 'cmplz-blocked', 'modal-open', 'noscroll', 'no-scroll', 'overflow-hidden', 'cky-modal-open']
        .forEach(c => { document.documentElement.classList.remove(c); document.body && document.body.classList.remove(c); });
    }, 350);
  }

  // ——— Registro ———
  function report(cmp, action, extra) {
    done = true;
    handledBanner = action !== 'none';
    const ms = Math.round(performance.now() - T0);
    const msg = Object.assign({ type: 'handled', host: HOST, cmp, action, ms, top: TOP, url: TOP ? location.href : '' }, extra || {});
    try { api.runtime.sendMessage(msg); } catch (e) { /* nada */ }
    if (handledBanner) { restoreScroll(); if (settings.cleanTracking) setTimeout(cleanCookies, 800); toast(cmp, action); }
  }

  function toast(cmp, action) {
    if (!settings.notify) return;
    const show = () => {
      if (!document.body) return;
      const host = document.createElement('div');
      host.setAttribute('data-pc-toast', '');
      host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:50%;bottom:18px;transform:translateX(-50%);pointer-events:none';
      const sh = host.attachShadow({ mode: 'closed' });
      const label = PC.ACTION_LABEL[action] || action;
      sh.innerHTML = `<style>
        .t{font:500 13px/1.25 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#f5f7fb;background:rgba(18,24,38,.92);
        -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);border-radius:999px;
        padding:9px 16px 9px 10px;display:flex;align-items:center;gap:9px;box-shadow:0 10px 30px rgba(0,0,0,.28);
        opacity:0;transform:translateY(10px);transition:opacity .35s,transform .35s;white-space:nowrap}
        .t.on{opacity:1;transform:none}.i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;
        background:linear-gradient(135deg,#34d399,#0ea5e9);font-size:12px}b{font-weight:650}</style>
        <div class="t"><span class="i">✓</span><span><b>${label}</b> · ${cmp}</span></div>`;
      document.body.appendChild(host);
      const t = sh.querySelector('.t');
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('on')));
      setTimeout(() => { t.classList.remove('on'); setTimeout(() => host.remove(), 400); }, 2600);
    };
    if (TOP) show();
  }

  // ——— Limpieza de cookies de rastreo accesibles desde la página ———
  function cleanCookies(all) {
    const names = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean);
    const parts = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < parts.length - 1; i++) domains.push('; domain=.' + parts.slice(i).join('.'));
    const paths = ['/', location.pathname.replace(/\/[^/]*$/, '') || '/'];
    let n = 0;
    for (const name of names) {
      const k = PC.classifyCookie(name).cat;
      const kill = all ? true : (k === 'analytics' && !eff.cats.analytics) || (k === 'marketing' && !eff.cats.marketing);
      if (!kill) continue;
      for (const d of domains) for (const p of paths) document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + p + d;
      n++;
    }
    return n;
  }

  // ——— Plataformas conocidas ———
  async function tryRule(rule) {
    attempts[rule.id] = (attempts[rule.id] || 0) + 1;
    let action = eff.action;
    let ok = false;
    let used = action;
    if (rule.api) ok = await pageCall(rule.api, action, eff.cats);
    if (ok) {
      await sleep(400);
      // Si la API respondió pero el aviso sigue, se recurre a los clics
      if (firstVisible(rule.detect)) ok = false;
    }
    if (!ok) {
      if (action === 'custom' && !rule.custom) used = 'reject';
      const steps = used === 'custom' ? rule.custom(eff.cats) : rule[used];
      if (steps) await runSteps(steps, rule, used !== 'custom');
      await sleep(500);
      ok = !firstVisible(rule.detect);
    }
    if (!ok && settings.hideUnhandled) {
      qsa(rule.prehide || rule.detect).forEach(hideElement);
      unprehide();
      report(rule.name, 'hidden', { note: 'No se pudo completar, se ocultó' });
      return true;
    }
    if (ok) { unprehide(); report(rule.name, used, { api: !!rule.api }); return true; }
    if (attempts[rule.id] >= 3) unprehide();
    return false;
  }

  // ——— Heurística para avisos no reconocidos ———
  const CAND = '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="gdpr" i],[class*="gdpr" i],[id*="privacy" i],[class*="privacy" i],[aria-label*="cookie" i],[role="dialog"],[role="alertdialog"],[aria-modal="true"],[class*="banner" i],[id*="banner" i],[class*="notice" i],[class*="aviso" i],[id*="aviso" i],[class*="galleta" i],[class*="popup" i],[class*="modal" i],body > div,body > section,body > aside,body > footer,body > div > div';
  const BTN = 'button,[role="button"],input[type="button"],input[type="submit"],a';

  function isFloating(el) {
    for (let e = el, i = 0; e && e !== document.body && i < 6; e = e.parentElement, i++) {
      const p = getComputedStyle(e).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return el.matches('[role="dialog"],[role="alertdialog"],[aria-modal="true"],dialog');
  }
  function btnText(b) { return PC.norm(b.value || b.getAttribute('aria-label') || b.innerText || b.textContent || ''); }
  function matchAny(list, t) { return t.length <= 60 && list.some(re => re.test(t)); }

  function findGenericBanner() {
    const found = [];
    for (const el of qsa(CAND)) {
      if (el.closest('[data-pc-hidden],[data-pc-toast]')) continue;
      if (!visible(el) || !isFloating(el)) continue;
      const txt = PC.norm(el.innerText || '');
      if (txt.length < 20 || txt.length > 4000 || !WORDS.banner.test(txt)) continue;
      found.push(el);
    }
    // el contenedor más externo
    return found.filter(el => !found.some(o => o !== el && o.contains(el)))[0] || null;
  }

  async function tryGeneric() {
    const banner = findGenericBanner();
    if (!banner) return false;
    attempts.generic = (attempts.generic || 0) + 1;
    const btns = [...banner.querySelectorAll(BTN)].filter(visible);
    const wantAccept = eff.action === 'accept';
    const list = wantAccept ? WORDS.accept : WORDS.reject;
    let btn = btns.find(b => matchAny(list, btnText(b)));
    if (btn) {
      clickEl(btn);
      await sleep(700);
      if (!visible(banner)) { report('Aviso genérico', wantAccept ? 'accept' : 'reject', { button: btnText(btn) }); return true; }
    }
    if (settings.hideUnhandled) {
      hideElement(banner);
      // también los fondos oscuros a pantalla completa
      for (const el of document.querySelectorAll('body > div, body > section')) {
        if (el === banner || el.hasAttribute('data-pc-hidden')) continue;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (cs.position === 'fixed' && r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.95 && (el.innerText || '').trim().length < 5) hideElement(el);
      }
      report('Aviso genérico', 'hidden');
      return true;
    }
    return false;
  }

  // ——— Ciclo principal ———
  async function scan() {
    if (done || !settings) return;
    for (const rule of RULES) {
      if (rule.host && !rule.host.test(HOST)) continue;
      if ((attempts[rule.id] || 0) >= 3) continue;
      if (!firstVisible(rule.detect)) continue;
      if (await tryRule(rule)) { afterDone(); return; }
    }
    const age = performance.now() - T0;
    if (age > 900 && (attempts.generic || 0) < 2 && await tryGeneric()) { afterDone(); return; }
  }
  function scheduleScan(delay) {
    if (done) return;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, delay == null ? 120 : delay);
  }
  function afterDone() {
    // Algunos sitios vuelven a mostrar el aviso: se vigila un rato más.
    setTimeout(() => { if (settings && !eff.off) { done = false; attempts = {}; startObserving(8000); } }, 2500);
  }
  function startObserving(duration) {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => scheduleScan(150));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
    const stopAt = Date.now() + duration;
    const poll = () => { if (Date.now() > stopAt || done) { observer && observer.disconnect(); if (!done && !handledBanner && duration > 10000) finalNone(); return; } scheduleScan(0); setTimeout(poll, 700); };
    poll();
  }
  function finalNone() {
    unprehide();
    if (TOP) { try { api.runtime.sendMessage({ type: 'status', host: HOST, action: 'none' }); } catch (e) { /* nada */ } }
  }

  // ——— Limpieza de parámetros de rastreo en la URL y en los enlaces ———
  function stripUrl(u) {
    try {
      const url = new URL(u, location.href);
      let changed = false;
      for (const p of [...url.searchParams.keys()]) {
        if (PC.TRACKING_PARAMS.includes(p) || /^utm_/i.test(p)) { url.searchParams.delete(p); changed = true; }
      }
      return changed ? url.toString() : null;
    } catch (e) { return null; }
  }
  function setupStrip() {
    if (TOP) {
      const clean = stripUrl(location.href);
      if (clean) { try { history.replaceState(history.state, '', clean); api.runtime.sendMessage({ type: 'stripped', host: HOST }); } catch (e) { /* nada */ } }
    }
    const onLink = e => {
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const clean = stripUrl(a.href);
      if (clean) a.href = clean;
    };
    document.addEventListener('mousedown', onLink, true);
    document.addEventListener('touchstart', onLink, { capture: true, passive: true });
    document.addEventListener('keydown', e => { if (e.key === 'Enter') onLink(e); }, true);
  }

  // ——— Selector de elementos para ocultar ———
  function cssPath(el) {
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id) && !/\d{4,}/.test(el.id)) return '#' + CSS.escape(el.id);
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.body && parts.length < 5; e = e.parentElement) {
      if (e.id && /^[a-zA-Z][\w-]*$/.test(e.id) && !/\d{4,}/.test(e.id)) { parts.unshift('#' + CSS.escape(e.id)); break; }
      let s = e.tagName.toLowerCase();
      const cls = [...e.classList].filter(c => /^[a-zA-Z][\w-]{1,40}$/.test(c) && !/\d{3,}/.test(c)).slice(0, 2);
      if (cls.length) s += '.' + cls.map(c => CSS.escape(c)).join('.');
      const sib = e.parentElement ? [...e.parentElement.children].filter(x => x.tagName === e.tagName) : [];
      if (sib.length > 1 && !cls.length) s += ':nth-of-type(' + (sib.indexOf(e) + 1) + ')';
      parts.unshift(s);
    }
    return parts.join(' > ');
  }

  let picking = false;
  function startPicker() {
    if (picking || !TOP) return;
    picking = true;
    let current = null;
    const box = document.createElement('div');
    box.style.cssText = 'all:initial;position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #22d3ee;background:rgba(34,211,238,.15);border-radius:6px;transition:all .08s';
    const barHost = document.createElement('div');
    barHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:50%;top:14px;transform:translateX(-50%)';
    const sh = barHost.attachShadow({ mode: 'closed' });
    sh.innerHTML = `<style>
      .b{font:500 14px -apple-system,system-ui,sans-serif;color:#eef2ff;background:rgba(15,23,42,.95);border:1px solid rgba(255,255,255,.14);
      border-radius:16px;padding:10px 12px;display:flex;gap:8px;align-items:center;box-shadow:0 12px 40px rgba(0,0,0,.35);max-width:92vw;flex-wrap:wrap;justify-content:center}
      .m{padding:0 6px}button{font:600 13px -apple-system,system-ui,sans-serif;border:0;border-radius:10px;padding:8px 12px;cursor:pointer;color:#0f172a;background:#e2e8f0}
      .ok{background:linear-gradient(135deg,#34d399,#22d3ee)}.x{background:#475569;color:#fff}</style>
      <div class="b"><span class="m">Toca el elemento que quieres ocultar</span>
      <button class="up" disabled>Ampliar</button><button class="ok" disabled>Ocultar siempre</button><button class="x">Cancelar</button></div>`;
    const msgEl = sh.querySelector('.m'), up = sh.querySelector('.up'), ok = sh.querySelector('.ok'), x = sh.querySelector('.x');
    document.documentElement.append(box, barHost);
    let locked = false;
    const mark = el => {
      current = el;
      const r = el.getBoundingClientRect();
      Object.assign(box.style, { left: r.left - 2 + 'px', top: r.top - 2 + 'px', width: r.width + 'px', height: r.height + 'px' });
    };
    const isOurs = el => el === box || el === barHost;
    const move = e => { if (locked) return; const el = document.elementFromPoint(e.clientX, e.clientY); if (el && !isOurs(el)) mark(el); };
    const pick = e => {
      if (isOurs(e.target) || e.composedPath().includes(barHost)) return;
      e.preventDefault(); e.stopPropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && !isOurs(el)) mark(el);
      locked = true;
      up.disabled = ok.disabled = false;
      msgEl.textContent = cssPath(current).slice(0, 60);
    };
    const end = () => {
      picking = false;
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('click', pick, true);
      box.remove(); barHost.remove();
    };
    up.onclick = () => { if (current && current.parentElement && current.parentElement !== document.body) { mark(current.parentElement); msgEl.textContent = cssPath(current).slice(0, 60); } };
    ok.onclick = async () => {
      const sel = cssPath(current);
      hideElement(current);
      end();
      try { await api.runtime.sendMessage({ type: 'addHideRule', host: HOST, selector: sel }); } catch (e) { /* nada */ }
      restoreScroll();
    };
    x.onclick = end;
    document.addEventListener('mousemove', move, true);
    document.addEventListener('click', pick, true);
  }

  // ——— Mensajes desde la ventana de la extensión ———
  api.runtime.onMessage.addListener((msg, sender, reply) => {
    if (!msg || !TOP && msg.type !== 'reapply') return;
    if (msg.type === 'pick') { startPicker(); reply({ ok: true }); }
    else if (msg.type === 'reapply') { done = false; attempts = {}; handledBanner = false; startObserving(6000); reply && reply({ ok: true }); }
    else if (msg.type === 'pageCookies') {
      reply({ cookies: document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean) });
    } else if (msg.type === 'clearPage') {
      const n = cleanCookies(true);
      if (msg.storage) { try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* nada */ } }
      reply({ removed: n });
    } else if (msg.type === 'status?') {
      reply({ host: HOST, done, handled: handledBanner });
    }
    return false;
  });

  // ——— Arranque ———
  async function init() {
    settings = await PC.getSettings();
    eff = PC.effective(settings, HOST);
    document.dispatchEvent(new CustomEvent('pc:cfg', { detail: JSON.stringify({ gpc: settings.enabled && settings.gpc && !eff.off }) }));
    applyUserHide();
    if (settings.enabled && settings.stripParams) setupStrip();

    let skipOnce = false;
    if (TOP) {
      try { const r = await api.runtime.sendMessage({ type: 'consumeSkip', host: HOST }); skipOnce = !!(r && r.skip); } catch (e) { /* nada */ }
    }
    if (eff.off || skipOnce) {
      if (TOP) try { api.runtime.sendMessage({ type: 'status', host: HOST, action: 'off' }); } catch (e) { /* nada */ }
      return;
    }
    prehide();
    // Si nada se resuelve, el ocultamiento previo se retira a los 10 s
    setTimeout(() => { if (!done) unprehide(); }, 10000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scheduleScan(0), { once: true });
    startObserving(15000);
    if (settings.cleanTracking && (!eff.cats.analytics || !eff.cats.marketing)) setTimeout(cleanCookies, 3000);
  }

  injectPage();
  init();

  api.storage.onChanged.addListener(ch => {
    if (!ch.settings) return;
    settings = PC.merge(ch.settings.newValue);
    eff = PC.effective(settings, HOST);
    applyUserHide();
    document.dispatchEvent(new CustomEvent('pc:cfg', { detail: JSON.stringify({ gpc: settings.enabled && settings.gpc && !eff.off }) }));
  });
})();
