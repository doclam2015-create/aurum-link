import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import path from 'path';
import os from 'os';
const ext = path.resolve('../extension');
const BASE = 'http://localhost:8766/';
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'pcprof' + Date.now()), {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`]
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
const errors = [];
ctx.on('weberror', e => errors.push(String(e.error())));
sw.on('console', m => { if (m.type() === 'error') errors.push('SW: ' + m.text()); });
const setS = async patch => sw.evaluate(async p => { const r = await chrome.storage.local.get('settings'); await chrome.storage.local.set({ settings: Object.assign({}, r.settings, p) }); }, patch);
await new Promise(r => setTimeout(r, 800));
await ctx.pages().forEach(p => p.close());
async function check(file, wait = 3500) {
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(file + ': ' + m.text()); });
  await p.goto(BASE + file);
  await p.waitForTimeout(wait);
  const r = await p.evaluate(() => ({ result: window.RESULT, gpc: navigator.globalPrivacyControl, overflow: getComputedStyle(document.body).overflow, url: location.href, hidden: [...document.querySelectorAll('[data-pc-hidden]')].map(e => e.id || e.className), cookies: document.cookie }));
  await p.close();
  return r;
}
const out = {};
await setS({ mode: 'reject', notify: true });
for (const f of ['onetrust.html', 'cookiebot.html', 'generic.html', 'nobutton.html', 'usercentrics.html']) out['reject:' + f] = await check(f);
await setS({ mode: 'accept' });
out['accept:onetrust'] = await check('onetrust.html');
out['accept:generic'] = await check('generic.html');
await setS({ mode: 'custom', categories: { preferences: true, analytics: false, marketing: true } });
out['custom:onetrust'] = await check('onetrust.html');
out['custom:cookiebot'] = await check('cookiebot.html');
await setS({ mode: 'reject', cleanTracking: true });
out['track'] = await check('tracking.html?a=1&utm_source=x&gclid=9', 4000);
await setS({ sites: { 'localhost': { mode: 'off' } } });
out['site-off:onetrust'] = await check('onetrust.html', 2000);
await setS({ sites: {} });
const st = await sw.evaluate(async () => chrome.storage.local.get(['stats', 'log']));
console.log(JSON.stringify(out, null, 1));
console.log('STATS', JSON.stringify(st.stats));
console.log('LOG', st.log.length, JSON.stringify(st.log[0]));
// Capturas de la ventana y el panel
for (const [w, h, tag] of [[430, 900, 'ret'], [1024, 768, 'apa']]) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: w, height: h });
  await p.goto(`chrome-extension://${id}/options/options.html#inicio`); await p.waitForTimeout(600);
  await p.screenshot({ path: `${os.tmpdir()}/opt-${tag}.png` });
  await p.goto(`chrome-extension://${id}/options/options.html#preferencias`); await p.waitForTimeout(400);
  await p.screenshot({ path: `${os.tmpdir()}/pref-${tag}.png` });
  await p.close();
}
const pp = await ctx.newPage(); await pp.setViewportSize({ width: 380, height: 760 });
await pp.goto(`chrome-extension://${id}/popup/popup.html`); await pp.waitForTimeout(700);
await pp.screenshot({ path: '' + os.tmpdir() + '/popup.png', fullPage: true });
const wp = await ctx.newPage(); await wp.setViewportSize({ width: 1024, height: 768 });
await wp.goto(`chrome-extension://${id}/options/options.html#bienvenida`); await wp.waitForTimeout(600);
await wp.screenshot({ path: '' + os.tmpdir() + '/welcome.png' });
for (const v of ['sitios','proteccion','historial']) { const p = await ctx.newPage(); await p.setViewportSize({ width: 430, height: 900 }); await p.goto(`chrome-extension://${id}/options/options.html#${v}`); await p.waitForTimeout(400); await p.screenshot({ path: `${os.tmpdir()}/${v}.png` }); await p.close(); }
{ const p = await ctx.newPage(); await p.setViewportSize({ width: 430, height: 900 }); await p.goto(BASE + 'generic.html'); await p.waitForTimeout(2300); await p.screenshot({ path: '' + os.tmpdir() + '/toast.png' });
  const tabs = await sw.evaluate(async () => (await chrome.tabs.query({})).map(t => [t.id, t.url]));
  const tid = tabs.find(t => t[1].includes('generic'))[0];
  const st = await sw.evaluate(async t => { const r = await chrome.storage.session.get('tabs'); return r.tabs[t]; }, tid);
  console.log('TABSTATE', JSON.stringify(st));
  await sw.evaluate(async t => chrome.tabs.sendMessage(t, { type: 'pick' }, { frameId: 0 }), tid);
  await p.mouse.move(100, 60); await p.mouse.click(100, 60); await p.waitForTimeout(300); await p.screenshot({ path: '' + os.tmpdir() + '/picker.png' }); await p.close(); }
console.log('ERRORS', JSON.stringify(errors, null, 1));
await ctx.close();
