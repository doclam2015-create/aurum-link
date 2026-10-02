/* Piloto de Cookies: ventana rápida */
(async function () {
  'use strict';
  const api = PC.api;
  const $ = id => document.getElementById(id);
  const CAT_COLORS = { necessary: '#10b981', preferences: '#8b5cf6', analytics: '#0ea5e9', marketing: '#f59e0b', unknown: '#94a3b8' };

  let settings = await PC.getSettings();
  applyTheme();
  let tab = null;
  try { [tab] = await api.tabs.query({ active: true, currentWindow: true }); } catch (e) { /* nada */ }
  const url = (tab && tab.url) || '';
  const web = /^https?:/.test(url);
  const host = web ? PC.hostOf(url) : '';

  function applyTheme() {
    if (settings.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', settings.theme);
  }
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.remove('on'), 1800); }
  async function save() { await PC.saveSettings(settings); }
  async function sendTab(msg) {
    if (!tab) return null;
    try { return await api.tabs.sendMessage(tab.id, msg, { frameId: 0 }); } catch (e) { return null; }
  }
  function setSeg(seg, v) { seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }

  function catsUI(container, cats, onChange) {
    container.innerHTML = '';
    for (const c of ['necessary', ...PC.CATS]) {
      const row = document.createElement('label');
      row.className = 'cat';
      const info = PC.CAT_INFO[c];
      row.innerHTML = `<div><b></b><small></small></div><span class="switch"><input type="checkbox"><span></span></span>`;
      row.querySelector('b').textContent = info.name;
      row.querySelector('small').textContent = info.desc;
      const inp = row.querySelector('input');
      if (c === 'necessary') { inp.checked = true; inp.disabled = true; }
      else { inp.checked = !!cats[c]; inp.onchange = () => { cats[c] = inp.checked; onChange(); }; }
      container.appendChild(row);
    }
  }

  // ——— Encabezado ———
  function renderGlobal() {
    $('enabled').checked = settings.enabled;
    $('globalState').textContent = settings.enabled ? 'Activo · ' + PC.MODES[settings.mode] : 'En pausa en todos los sitios';
    setSeg($('globalMode'), settings.mode);
    $('globalCats').hidden = settings.mode !== 'custom';
    if (settings.mode === 'custom') catsUI($('globalCats'), settings.categories, () => { save(); toast('Preferencias guardadas'); });
  }
  $('enabled').onchange = async () => { settings.enabled = $('enabled').checked; await save(); renderGlobal(); toast(settings.enabled ? 'Piloto activado' : 'Piloto en pausa'); };
  $('globalMode').onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    settings.mode = b.dataset.v; await save(); renderGlobal(); renderSite(); toast('Preferencia general: ' + PC.MODES[settings.mode]);
  };

  // ——— Sitio actual ———
  async function renderSite() {
    $('host').textContent = host || (url ? 'Página del sistema' : 'Sin página');
    $('fav').textContent = host ? host[0] : '•';
    const rule = PC.siteRule(settings, host);
    const siteMode = rule && rule.host === host ? (rule.mode || 'global') : 'global';
    setSeg($('siteMode'), siteMode);
    const showCats = siteMode === 'custom';
    $('siteCats').hidden = !showCats;
    if (showCats) {
      const s = settings.sites[host];
      s.categories = Object.assign({}, settings.categories, s.categories || {});
      catsUI($('siteCats'), s.categories, () => { save(); toast('Guardado para ' + host); });
    }
    const st = tab && web ? await api.runtime.sendMessage({ type: 'tabState', tabId: tab.id }).catch(() => null) : null;
    const d = $('detail');
    d.innerHTML = '';
    const pill = (txt, cls) => { const s = document.createElement('span'); s.className = 'pill ' + (cls || ''); s.textContent = txt; d.appendChild(s); };
    const eff = PC.effective(settings, host);
    if (!web) pill('Aquí no actúa', 'off');
    else if (eff.off) pill(settings.enabled ? 'Pausado en este sitio' : 'Pausa general', 'off');
    else if (st && st.host === host && st.action && st.action !== 'none' && st.action !== 'off') {
      pill(PC.ACTION_LABEL[st.action] || st.action, st.action === 'accept' ? 'warn' : st.action === 'hidden' ? 'info' : 'ok');
      const t = document.createElement('span');
      t.textContent = (st.cmp || '') + ' · ' + PC.timeAgo(st.t) + (st.ms ? ' · ' + (st.ms / 1000).toFixed(1) + ' s' : '');
      d.appendChild(t);
    } else if (st && st.host === host && st.action === 'off') pill('Aviso mostrado una vez', 'off');
    else if (st && st.host === host) pill('Sin aviso de cookies', '');
    else pill('Vigilando…', '');
    ['reapply', 'showOnce', 'pick', 'inspect', 'clear'].forEach(id => { $(id).disabled = !web; });
  }

  $('siteMode').onclick = async e => {
    const b = e.target.closest('button'); if (!b || !host) return;
    const v = b.dataset.v;
    if (v === 'global') delete settings.sites[host];
    else settings.sites[host] = Object.assign({}, settings.sites[host], { mode: v, added: (settings.sites[host] && settings.sites[host].added) || Date.now() });
    await save();
    renderSite();
    toast(v === 'global' ? 'Usa la preferencia general' : host + ': ' + PC.MODES[v]);
  };

  // ——— Acciones ———
  $('reapply').onclick = async () => {
    const r = await sendTab({ type: 'reapply' });
    toast(r ? 'Buscando el aviso…' : 'Recarga la página para activar');
    setTimeout(renderSite, 2500);
  };
  $('showOnce').onclick = async () => {
    await api.runtime.sendMessage({ type: 'skipOnce', tabId: tab.id, host });
    await api.tabs.reload(tab.id);
    window.close();
  };
  $('pick').onclick = async () => {
    const r = await sendTab({ type: 'pick' });
    if (r) window.close(); else toast('Recarga la página e intenta otra vez');
  };
  $('panel').onclick = () => { api.runtime.openOptionsPage ? api.runtime.openOptionsPage() : api.tabs.create({ url: api.runtime.getURL('options/options.html') }); window.close(); };

  async function loadCookies() {
    let list = null, note = '';
    const r = await api.runtime.sendMessage({ type: 'siteCookies', host }).catch(() => null);
    if (r && r.cookies) list = r.cookies;
    else {
      const p = await sendTab({ type: 'pageCookies' });
      list = p ? p.cookies.map(name => ({ name })) : [];
      note = 'Sólo las visibles para la página';
    }
    return { list, note };
  }
  async function updateCount() {
    if (!web) return;
    const { list } = await loadCookies();
    $('ckCount').textContent = list.length ? '(' + list.length + ')' : '';
  }
  $('inspect').onclick = async () => {
    const box = $('inspector');
    if (!box.hidden) { box.hidden = true; return; }
    const { list, note } = await loadCookies();
    const counts = { necessary: 0, preferences: 0, analytics: 0, marketing: 0, unknown: 0 };
    const ul = $('ckList'); ul.innerHTML = '';
    const rows = list.map(c => Object.assign({ k: PC.classifyCookie(c.name) }, c))
      .sort((a, b) => ['marketing', 'analytics', 'unknown', 'preferences', 'necessary'].indexOf(a.k.cat) - ['marketing', 'analytics', 'unknown', 'preferences', 'necessary'].indexOf(b.k.cat));
    for (const c of rows) {
      counts[c.k.cat]++;
      const li = document.createElement('li');
      li.innerHTML = '<code></code><span class="pill"></span>';
      li.querySelector('code').textContent = c.name;
      li.querySelector('code').title = (c.domain || host) + (c.httpOnly ? ' · HttpOnly' : '') + (c.session ? ' · de sesión' : '');
      const p = li.querySelector('.pill');
      p.textContent = c.k.who || (PC.CAT_INFO[c.k.cat] ? PC.CAT_INFO[c.k.cat].name : 'Desconocida');
      p.style.color = CAT_COLORS[c.k.cat];
      ul.appendChild(li);
    }
    if (!rows.length) ul.innerHTML = '<li class="muted">Este sitio no tiene cookies guardadas.</li>';
    const bars = $('ckBars'); bars.innerHTML = '';
    for (const k in counts) if (counts[k]) { const i = document.createElement('i'); i.style.background = CAT_COLORS[k]; i.style.width = (counts[k] / rows.length * 100) + '%'; i.title = k + ': ' + counts[k]; bars.appendChild(i); }
    let leg = box.querySelector('.legend');
    if (!leg) { leg = document.createElement('div'); leg.className = 'legend'; bars.after(leg); }
    leg.innerHTML = '';
    const names = { necessary: 'Necesarias', preferences: 'Preferencias', analytics: 'Estadísticas', marketing: 'Publicidad', unknown: 'Otras' };
    for (const k in counts) if (counts[k]) { const s = document.createElement('span'); s.style.setProperty('--c', CAT_COLORS[k]); s.textContent = names[k] + ' ' + counts[k]; leg.appendChild(s); }
    $('inspNote').textContent = note;
    box.hidden = false;
  };
  $('clear').onclick = async () => {
    if (!confirm('¿Borrar las cookies y el almacenamiento local de ' + host + '? Puede que tengas que volver a iniciar sesión.')) return;
    const r = await api.runtime.sendMessage({ type: 'clearSiteCookies', host }).catch(() => null);
    const p = await sendTab({ type: 'clearPage', storage: true });
    const n = (r && r.removed) || (p && p.removed) || 0;
    toast(n + ' cookies borradas');
    $('inspector').hidden = true;
    updateCount();
  };

  // ——— Estadísticas ———
  async function renderStats() {
    const r = await api.storage.local.get('stats');
    const s = r.stats || { total: 0, byDay: {} };
    $('stToday').textContent = (s.byDay && s.byDay[PC.dayKey()]) || 0;
    $('stTotal').textContent = s.total || 0;
    $('stTime').textContent = PC.fmtDuration((s.total || 0) * settings.secondsPerBanner);
  }

  renderGlobal();
  renderSite();
  renderStats();
  updateCount();
  api.storage.onChanged.addListener(ch => {
    if (ch.settings) { settings = PC.merge(ch.settings.newValue); applyTheme(); renderGlobal(); }
    if (ch.stats) { renderStats(); renderSite(); }
  });
})();
