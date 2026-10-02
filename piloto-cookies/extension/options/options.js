/* Piloto de Cookies: panel completo */
(async function () {
  'use strict';
  const api = PC.api;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ACTION_COLORS = { reject: '#10b981', custom: '#8b5cf6', accept: '#f59e0b', hidden: '#0ea5e9' };
  const TRASH = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

  let settings = await PC.getSettings();
  let stats = {}, log = [];

  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.remove('on'), 1900); }
  async function save(msg) { await PC.saveSettings(settings); if (msg) toast(msg); }
  function applyTheme() {
    if (settings.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', settings.theme);
  }
  function setSeg(seg, v) { seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }

  // ——— Navegación ———
  document.querySelectorAll('#nav a').forEach(a => {
    a.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 24 24"><path d="${a.dataset.i}"/></svg>`);
  });
  function route() {
    let h = (location.hash || '#inicio').slice(1);
    if (h === 'bienvenida') { $('welcome').hidden = false; h = 'inicio'; }
    if (!$('v-' + h)) h = 'inicio';
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + h));
    document.querySelectorAll('#nav a').forEach(a => {
      const on = a.getAttribute('href') === '#' + h;
      a.classList.toggle('on', on);
      if (on) { const nav = $('nav'); if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2; }
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ——— Bienvenida ———
  $('welcome').addEventListener('click', async e => {
    const b = e.target.closest('.mode');
    if (!b) return;
    settings.mode = b.dataset.v;
    await save('Listo: ' + PC.MODES[settings.mode]);
    $('welcome').hidden = true;
    location.hash = settings.mode === 'custom' ? '#preferencias' : '#inicio';
    renderPrefs();
  });

  // ——— Inicio ———
  async function loadStats() {
    const r = await api.storage.local.get(['stats', 'log']);
    stats = Object.assign({ total: 0, byDay: {}, byCmp: {}, byAction: {}, sites: {}, stripped: 0, since: Date.now() }, r.stats || {});
    log = r.log || [];
  }
  function renderHome() {
    const today = stats.byDay[PC.dayKey()] || 0;
    let week = 0;
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = PC.dayKey(d), n = stats.byDay[k] || 0;
      days.push({ d, n });
      if (i < 7) week += n;
    }
    $('kTotal').textContent = stats.total.toLocaleString('es');
    $('kSince').textContent = 'desde el ' + new Date(stats.since).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    $('kToday').textContent = today;
    $('kWeek').textContent = week + ' en los últimos 7 días';
    $('kTime').textContent = PC.fmtDuration(stats.total * settings.secondsPerBanner);
    $('kStrip').textContent = (stats.stripped || 0).toLocaleString('es');
    const h = new Date().getHours();
    document.querySelector('#v-inicio h1').textContent = (h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches') + ' 👋';
    $('hello').textContent = stats.total ? `Tu piloto ya respondió ${stats.total.toLocaleString('es')} avisos de cookies por ti.` : 'Navega con normalidad: aquí verás lo que el piloto hace por ti.';

    const max = Math.max(1, ...days.map(x => x.n));
    $('chart').innerHTML = days.map(x => `<div class="bar ${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, x.n / max * 100) : 3}%" data-tip="${x.d.toLocaleDateString('es', { day: 'numeric', month: 'short' })}: ${x.n}"></div>`).join('');
    $('chartSum').textContent = days.reduce((a, x) => a + x.n, 0) + ' avisos';

    // Dona de acciones
    const acts = Object.entries(stats.byAction || {}).filter(([k, v]) => v > 0 && ACTION_COLORS[k]);
    const tot = acts.reduce((a, [, v]) => a + v, 0);
    let svg = '<circle cx="60" cy="60" r="44" fill="none" stroke="var(--bg2)" stroke-width="16"/>';
    let off = 0;
    const C = 2 * Math.PI * 44;
    for (const [k, v] of acts) {
      const len = v / tot * C;
      svg += `<circle cx="60" cy="60" r="44" fill="none" stroke="${ACTION_COLORS[k]}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
      off += len;
    }
    svg += `<text x="60" y="58" text-anchor="middle" font-size="20" font-weight="800" fill="currentColor">${tot}</text><text x="60" y="74" text-anchor="middle" font-size="9" fill="var(--muted)">avisos</text>`;
    $('donut').innerHTML = svg;
    $('donutLeg').innerHTML = acts.length ? acts.map(([k, v]) => `<div><i style="background:${ACTION_COLORS[k]}"></i>${esc(PC.ACTION_LABEL[k])}<b>${Math.round(v / tot * 100)}%</b></div>`).join('') : '<div class="faint">Aún sin datos</div>';

    const rank = (obj, el) => {
      const arr = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, 7);
      const top = arr.length ? arr[0][1] : 1;
      el.innerHTML = arr.length ? arr.map(([k, v]) => `<li><span>${esc(k)}</span><i class="mini" style="width:${Math.max(8, v / top * 70)}px"></i><em>${v}</em></li>`).join('') : '<li class="empty" style="counter-increment:none">Aún sin datos</li>';
    };
    rank(stats.byCmp, $('topCmp'));
    rank(stats.sites, $('topSites'));
  }

  // ——— Preferencias ———
  function renderPrefs() {
    setSeg($('modes'), settings.mode);
    const list = $('catList');
    list.classList.toggle('dim', settings.mode !== 'custom');
    list.innerHTML = '';
    for (const c of ['necessary', ...PC.CATS]) {
      const info = PC.CAT_INFO[c];
      const checked = c === 'necessary' || settings.mode === 'accept' || (settings.mode === 'custom' && settings.categories[c]);
      const row = document.createElement('label');
      row.className = 'item' + (c === 'necessary' ? ' always' : '');
      row.innerHTML = `<div><b>${esc(info.name)}</b><small>${esc(info.desc)}</small></div><span class="switch"><input type="checkbox" ${checked ? 'checked' : ''} ${c === 'necessary' ? 'disabled' : ''}><span></span></span>`;
      if (c !== 'necessary') row.querySelector('input').onchange = e => { settings.categories[c] = e.target.checked; save('Guardado'); };
      list.appendChild(row);
    }
  }
  $('modes').onclick = e => { const b = e.target.closest('.mode'); if (!b) return; settings.mode = b.dataset.v; save(PC.MODES[settings.mode]); renderPrefs(); };

  // ——— Protección ———
  const PROT = [
    ['enabled', 'Piloto activo', 'Pausa o activa el piloto en todos los sitios.'],
    ['hideUnhandled', 'Ocultar avisos que no puede responder', 'Si un aviso no tiene un botón reconocible, lo oculta igualmente.'],
    ['restoreScroll', 'Devolver el desplazamiento', 'Algunos avisos bloquean la página; el piloto vuelve a permitir mover la página.'],
    ['gpc', 'Global Privacy Control', 'Avisa a los sitios que no vendan ni compartan tus datos (señal legal en varios países).'],
    ['stripParams', 'Limpiar enlaces de rastreo', 'Quita utm, fbclid, gclid y otros parámetros que te siguen de sitio en sitio.'],
    ['cleanTracking', 'Borrar cookies de rastreo', 'Tras rechazar, elimina cookies de estadística y publicidad conocidas (Google, Meta, TikTok…).'],
    ['notify', 'Aviso discreto', 'Muestra una pequeña notificación cuando se responde un aviso.'],
    ['badge', 'Distintivo en el ícono', 'Marca el ícono con ✓ cuando actuó en la página.']
  ];
  function renderProt() {
    $('protList').innerHTML = PROT.map(([k, t, d]) => `<label class="item"><div><b>${t}</b><small>${d}</small></div><span class="switch"><input type="checkbox" data-k="${k}" ${settings[k] ? 'checked' : ''}><span></span></span></label>`).join('');
    $('secs').value = settings.secondsPerBanner;
    setSeg($('theme'), settings.theme);
    $('enabled').checked = settings.enabled;
  }
  $('protList').onchange = e => { const k = e.target.dataset.k; if (!k) return; settings[k] = e.target.checked; save('Guardado'); if (k === 'enabled') $('enabled').checked = settings.enabled; };
  $('secs').onchange = e => { settings.secondsPerBanner = Math.min(60, Math.max(1, +e.target.value || 6)); save('Guardado'); renderHome(); };
  $('theme').onclick = e => { const b = e.target.closest('button'); if (!b) return; settings.theme = b.dataset.v; applyTheme(); setSeg($('theme'), settings.theme); save(); };
  $('enabled').onchange = e => { settings.enabled = e.target.checked; save(settings.enabled ? 'Piloto activado' : 'Piloto en pausa'); renderProt(); };

  // ——— Sitios ———
  function cleanHost(v) {
    v = String(v || '').trim().toLowerCase();
    if (!v) return '';
    if (!/^[a-z]+:\/\//.test(v)) v = 'https://' + v;
    return PC.hostOf(v);
  }
  function renderSites() {
    const q = $('siteSearch').value.trim().toLowerCase();
    const entries = Object.entries(settings.sites).filter(([h]) => !q || h.includes(q)).sort((a, b) => a[0].localeCompare(b[0]));
    const opts = v => ['reject', 'custom', 'accept', 'off'].map(m => `<option value="${m}" ${m === v ? 'selected' : ''}>${PC.MODES[m]}</option>`).join('');
    $('siteList').innerHTML = entries.length ? entries.map(([h, s]) => `
      <div class="item siteRow" data-h="${esc(h)}">
        <div class="fav">${esc(h[0])}</div>
        <div><b>${esc(h)}</b><small>${s.mode === 'custom' ? 'Permite: ' + (PC.CATS.filter(c => (s.categories || settings.categories)[c]).map(c => PC.CAT_INFO[c].name).join(', ') || 'sólo necesarias') : 'Incluye subdominios'}</small></div>
        <select>${opts(s.mode)}</select>
        <button class="iconBtn" title="Quitar">${TRASH}</button>
      </div>`).join('') : `<div class="empty">${q ? 'Ningún sitio coincide.' : 'Sin excepciones. Todos los sitios usan la preferencia general.'}</div>`;
  }
  $('addSite').onsubmit = e => {
    e.preventDefault();
    const h = cleanHost($('siteHost').value);
    if (!h || !h.includes('.')) { toast('Escribe un dominio válido'); return; }
    settings.sites[h] = { mode: $('siteMode').value, added: Date.now() };
    $('siteHost').value = '';
    save('Agregado ' + h); renderSites();
  };
  $('siteSearch').oninput = renderSites;
  $('siteList').onchange = e => { const row = e.target.closest('[data-h]'); if (!row) return; settings.sites[row.dataset.h].mode = e.target.value; save('Guardado'); renderSites(); };
  $('siteList').onclick = e => { const b = e.target.closest('.iconBtn'); if (!b) return; const h = b.closest('[data-h]').dataset.h; delete settings.sites[h]; save('Quitado ' + h); renderSites(); };

  // ——— Elementos ocultos ———
  function renderHide() {
    const rows = [];
    for (const [h, list] of Object.entries(settings.hideRules).sort()) list.forEach((sel, i) => rows.push({ h, sel, i }));
    $('hideList').innerHTML = rows.length ? rows.map(r => `<div class="item" data-h="${esc(r.h)}" data-i="${r.i}"><div><b>${esc(r.h)}</b><small><code>${esc(r.sel)}</code></small></div><button class="iconBtn" title="Quitar">${TRASH}</button></div>`).join('') : '<div class="empty">Aún no ocultas ningún elemento.</div>';
  }
  $('addHide').onsubmit = e => {
    e.preventDefault();
    const h = cleanHost($('hideHost').value), sel = $('hideSel').value.trim();
    try { document.querySelector(sel); } catch (err) { toast('Selector CSS no válido'); return; }
    if (!h) { toast('Escribe un dominio válido'); return; }
    (settings.hideRules[h] = settings.hideRules[h] || []).push(sel);
    $('hideSel').value = '';
    save('Agregado'); renderHide();
  };
  $('hideList').onclick = e => {
    const b = e.target.closest('.iconBtn'); if (!b) return;
    const row = b.closest('[data-h]'), h = row.dataset.h;
    settings.hideRules[h].splice(+row.dataset.i, 1);
    if (!settings.hideRules[h].length) delete settings.hideRules[h];
    save('Quitado'); renderHide();
  };

  // ——— Historial ———
  function filteredLog() {
    const q = $('logSearch').value.trim().toLowerCase(), a = $('logAction').value;
    return log.filter(x => (!a || x.action === a) && (!q || x.host.toLowerCase().includes(q) || String(x.cmp).toLowerCase().includes(q)));
  }
  function renderLog() {
    const rows = filteredLog().slice(0, 300);
    $('logBody').innerHTML = rows.length ? rows.map(x => `<tr><td class="faint" title="${new Date(x.t).toLocaleString('es')}">${PC.timeAgo(x.t)}</td><td>${esc(x.host)}</td><td>${esc(x.cmp)}</td><td><span class="pill" style="color:${ACTION_COLORS[x.action] || 'inherit'}">${esc(PC.ACTION_LABEL[x.action] || x.action)}</span></td><td class="faint">${x.ms ? (x.ms / 1000).toFixed(1) + ' s' : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Sin registros todavía.</td></tr>';
  }
  $('logSearch').oninput = renderLog;
  $('logAction').onchange = renderLog;
  $('logCsv').onclick = () => {
    const rows = [['fecha', 'sitio', 'plataforma', 'accion', 'ms']].concat(filteredLog().map(x => [new Date(x.t).toISOString(), x.host, x.cmp, x.action, x.ms || '']));
    download('piloto-cookies-historial.csv', rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n'), 'text/csv');
  };
  $('logClear').onclick = async () => { if (!confirm('¿Borrar el historial?')) return; await api.storage.local.set({ log: [] }); };

  // ——— Compatibilidad ———
  function renderCompat() {
    const names = [...new Set((globalThis.PC_RULES || []).map(r => r.name))].sort((a, b) => a.localeCompare(b));
    $('compatIntro').textContent = `Reconoce ${names.length} plataformas de consentimiento y sitios con aviso propio, que en conjunto cubren la gran mayoría de los avisos de la web. Para el resto usa el reconocimiento automático.`;
    $('cmpChips').innerHTML = names.map(n => `<span>${esc(n)}</span>`).join('');
  }

  // ——— Respaldo ———
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportText() { return JSON.stringify({ app: 'piloto-cookies', exported: new Date().toISOString(), settings }, null, 2); }
  async function importText(text) {
    try {
      const data = JSON.parse(text);
      const s = data.settings || data;
      if (typeof s !== 'object' || !('mode' in s)) throw new Error('formato');
      settings = PC.merge(s);
      await save('Configuración importada');
      renderAll();
    } catch (e) { toast('El archivo no es una configuración válida'); }
  }
  $('exp').onclick = () => download('piloto-cookies-' + PC.dayKey() + '.json', exportText());
  $('imp').onchange = async e => { const f = e.target.files[0]; if (f) importText(await f.text()); e.target.value = ''; };
  $('copyCfg').onclick = async () => { try { await navigator.clipboard.writeText(exportText()); toast('Copiada al portapapeles'); } catch (e) { toast('No se pudo copiar'); } };
  $('pasteCfg').onclick = async () => {
    let t = '';
    try { t = await navigator.clipboard.readText(); } catch (e) { t = prompt('Pega aquí la configuración:') || ''; }
    if (t) importText(t);
  };
  $('resetStats').onclick = async () => { if (!confirm('¿Reiniciar estadísticas e historial?')) return; await api.runtime.sendMessage({ type: 'resetStats' }); toast('Estadísticas reiniciadas'); };
  $('resetAll').onclick = async () => { if (!confirm('¿Volver a la configuración de fábrica? Se pierden sitios y elementos ocultos.')) return; settings = PC.merge(null); await save('Configuración restablecida'); renderAll(); };

  function renderAll() { applyTheme(); renderPrefs(); renderProt(); renderSites(); renderHide(); renderHome(); renderLog(); }

  $('ver').textContent = 'Versión ' + api.runtime.getManifest().version;
  await loadStats();
  renderCompat();
  renderAll();
  route();

  api.storage.onChanged.addListener(async ch => {
    if (ch.settings) { settings = PC.merge(ch.settings.newValue); applyTheme(); renderPrefs(); renderProt(); renderSites(); renderHide(); }
    if (ch.stats || ch.log) { await loadStats(); renderHome(); renderLog(); }
  });
})();
