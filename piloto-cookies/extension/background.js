/* Piloto de Cookies: proceso de fondo (estadísticas, historial, distintivo, GPC y cookies). */
try { importScripts('shared/common.js'); } catch (e) { /* en Safari con "scripts" ya viene cargado */ }

const api = PC.api;
const LOG_MAX = 400;
const mem = { tabs: {}, skip: {} };
const sessionStore = api.storage.session || null;

async function sget(key) {
  if (sessionStore) { try { const r = await sessionStore.get(key); return r[key]; } catch (e) { /* nada */ } }
  return mem[key];
}
async function sset(key, val) {
  mem[key] = val;
  if (sessionStore) { try { await sessionStore.set({ [key]: val }); } catch (e) { /* nada */ } }
}

function emptyStats() {
  return { total: 0, byDay: {}, byCmp: {}, byAction: {}, sites: {}, stripped: 0, since: Date.now() };
}
async function getStats() {
  const r = await api.storage.local.get(['stats', 'log']);
  return { stats: Object.assign(emptyStats(), r.stats || {}), log: r.log || [] };
}

// Las escrituras se encadenan para no perder eventos simultáneos
let chain = Promise.resolve();
function serial(fn) { chain = chain.then(fn, fn); return chain; }

async function recordHandled(msg, tab) {
  const { stats, log } = await getStats();
  const day = PC.dayKey();
  stats.total++;
  stats.byDay[day] = (stats.byDay[day] || 0) + 1;
  stats.byCmp[msg.cmp] = (stats.byCmp[msg.cmp] || 0) + 1;
  stats.byAction[msg.action] = (stats.byAction[msg.action] || 0) + 1;
  stats.sites[msg.host] = (stats.sites[msg.host] || 0) + 1;
  // Se conservan sólo los últimos 120 días
  const keys = Object.keys(stats.byDay).sort();
  while (keys.length > 120) delete stats.byDay[keys.shift()];
  log.unshift({ t: Date.now(), host: msg.host, cmp: msg.cmp, action: msg.action, ms: msg.ms, note: msg.note || '' });
  log.length = Math.min(log.length, LOG_MAX);
  await api.storage.local.set({ stats, log });
  if (tab && tab.id != null) await setTabState(tab.id, { host: msg.host, cmp: msg.cmp, action: msg.action, t: Date.now(), ms: msg.ms });
}

async function setTabState(tabId, st) {
  const tabs = (await sget('tabs')) || {};
  const prev = tabs[tabId];
  // Un aviso respondido no se pisa con "sin aviso" de la misma página
  if (prev && st.action === 'none' && prev.host === st.host && prev.action !== 'none' && prev.action !== 'off') return;
  tabs[tabId] = st;
  await sset('tabs', tabs);
  updateBadge(tabId, st);
}

async function updateBadge(tabId, st) {
  const s = await PC.getSettings();
  let text = '';
  let color = '#10b981';
  if (s.badge && st) {
    if (st.action === 'off') { text = '❚❚'; color = '#64748b'; }
    else if (st.action === 'hidden') { text = '•'; color = '#0ea5e9'; }
    else if (st.action && st.action !== 'none') { text = '✓'; color = st.action === 'accept' ? '#f59e0b' : '#10b981'; }
  }
  if (!s.enabled) { text = s.badge ? 'off' : ''; color = '#64748b'; }
  try {
    await api.action.setBadgeText({ tabId, text });
    if (api.action.setBadgeBackgroundColor) await api.action.setBadgeBackgroundColor({ tabId, color });
  } catch (e) { /* la pestaña ya no existe */ }
}

// ——— Global Privacy Control también en las cabeceras (Sec-GPC: 1) ———
async function syncGpcHeader() {
  if (!api.declarativeNetRequest || !api.declarativeNetRequest.updateDynamicRules) return;
  const s = await PC.getSettings();
  try {
    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: s.enabled && s.gpc ? [{
        id: 1, priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: [{ header: 'Sec-GPC', operation: 'set', value: '1' }] },
        condition: { resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'stylesheet', 'other'] }
      }] : []
    });
  } catch (e) { /* no soportado */ }
}

// ——— Cookies de un sitio ———
async function siteCookies(host) {
  if (!api.cookies || !api.cookies.getAll) return null;
  try {
    const list = await api.cookies.getAll({ domain: host });
    return list;
  } catch (e) { return null; }
}
async function clearSiteCookies(host) {
  const list = await siteCookies(host);
  if (!list) return null;
  let n = 0;
  for (const c of list) {
    const url = (c.secure ? 'https://' : 'http://') + c.domain.replace(/^\./, '') + c.path;
    try { await api.cookies.remove({ url, name: c.name, storeId: c.storeId }); n++; } catch (e) { /* nada */ }
  }
  return n;
}

api.runtime.onMessage.addListener((msg, sender, reply) => {
  const tab = sender && sender.tab;
  (async () => {
    switch (msg && msg.type) {
      case 'handled':
        await serial(() => recordHandled(msg, tab));
        return { ok: true };
      case 'status':
        if (tab) await setTabState(tab.id, { host: msg.host, action: msg.action, t: Date.now() });
        return { ok: true };
      case 'stripped':
        await serial(async () => { const { stats } = await getStats(); stats.stripped++; await api.storage.local.set({ stats }); });
        return { ok: true };
      case 'consumeSkip': {
        const skip = (await sget('skip')) || {};
        const key = (tab ? tab.id : 'x') + '|' + msg.host;
        const hit = !!skip[key];
        if (hit) { delete skip[key]; await sset('skip', skip); }
        return { skip: hit };
      }
      case 'skipOnce': {
        const skip = (await sget('skip')) || {};
        skip[msg.tabId + '|' + msg.host] = 1;
        await sset('skip', skip);
        return { ok: true };
      }
      case 'tabState': {
        const tabs = (await sget('tabs')) || {};
        return tabs[msg.tabId] || null;
      }
      case 'addHideRule': {
        const s = await PC.getSettings();
        const list = s.hideRules[msg.host] || [];
        if (!list.includes(msg.selector)) list.push(msg.selector);
        s.hideRules[msg.host] = list;
        await PC.saveSettings(s);
        return { ok: true };
      }
      case 'siteCookies': {
        const list = await siteCookies(msg.host);
        return { cookies: list ? list.map(c => ({ name: c.name, domain: c.domain, secure: c.secure, httpOnly: c.httpOnly, session: c.session, expires: c.expirationDate || 0 })) : null };
      }
      case 'clearSiteCookies':
        return { removed: await clearSiteCookies(msg.host) };
      case 'resetStats':
        await api.storage.local.set({ stats: emptyStats(), log: [] });
        return { ok: true };
      default:
        return null;
    }
  })().then(reply, () => reply(null));
  return true;
});

api.tabs && api.tabs.onRemoved && api.tabs.onRemoved.addListener(async tabId => {
  const tabs = (await sget('tabs')) || {};
  if (tabs[tabId]) { delete tabs[tabId]; await sset('tabs', tabs); }
});
api.tabs && api.tabs.onUpdated && api.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status === 'loading' && info.url) {
    const tabs = (await sget('tabs')) || {};
    if (tabs[tabId] && tabs[tabId].host !== PC.hostOf(info.url)) { delete tabs[tabId]; await sset('tabs', tabs); updateBadge(tabId, null); }
  }
});

api.storage.onChanged.addListener(ch => { if (ch.settings) syncGpcHeader(); });

api.runtime.onInstalled.addListener(async details => {
  const r = await api.storage.local.get('settings');
  if (!r.settings) await PC.saveSettings(PC.merge(null));
  syncGpcHeader();
  if (details.reason === 'install') {
    try { await api.tabs.create({ url: api.runtime.getURL('options/options.html#bienvenida') }); } catch (e) { /* nada */ }
  }
});
api.runtime.onStartup && api.runtime.onStartup.addListener(syncGpcHeader);
