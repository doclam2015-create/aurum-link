/* Piloto de Cookies: utilidades compartidas (fondo, contenido, ventana y panel). */
(function (g) {
  'use strict';
  const api = g.browser || g.chrome;

  const CATS = ['preferences', 'analytics', 'marketing'];

  const CAT_INFO = {
    necessary: { name: 'Necesarias', desc: 'Imprescindibles para que el sitio funcione (sesión, carrito, seguridad). Siempre activas.' },
    preferences: { name: 'Preferencias', desc: 'Recuerdan idioma, región o ajustes de la página.' },
    analytics: { name: 'Estadísticas', desc: 'Miden visitas y rendimiento (Google Analytics, Hotjar…).' },
    marketing: { name: 'Publicidad y redes', desc: 'Siguen tu actividad para mostrarte anuncios o contenido de redes sociales.' }
  };

  const MODES = {
    reject: 'Sólo necesarias',
    custom: 'Personalizado',
    accept: 'Aceptar todo',
    off: 'Desactivado'
  };

  const DEFAULTS = {
    version: 1,
    enabled: true,
    mode: 'reject',
    categories: { preferences: false, analytics: false, marketing: false },
    hideUnhandled: true,
    restoreScroll: true,
    gpc: true,
    stripParams: true,
    cleanTracking: false,
    notify: true,
    badge: true,
    theme: 'auto',
    secondsPerBanner: 6,
    sites: {},        // host -> { mode, categories?, note? }
    hideRules: {}     // host -> [selector, …]
  };

  const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_name',
    'utm_brand', 'utm_social', 'utm_social-type', 'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
    'msclkid', 'mc_cid', 'mc_eid', 'igshid', 'igsh', '_hsenc', '_hsmi', '__hssc', '__hstc', '__hsfp', 'hsCtaTracking',
    'yclid', 'twclid', 'ttclid', 'li_fat_id', 'mkt_tok', 'oly_anon_id', 'oly_enc_id', 'vero_id', 'wickedid',
    '_openstat', 'epik', 'rb_clickid', 's_cid', 'ncid', 'sc_cid', 'si', 'ref_src', 'spm'
  ];

  // Cookies conocidas → categoría. Se usa en el inspector y en la limpieza de rastreadores.
  const KNOWN_COOKIES = [
    [/^(_ga|_gid|_gat|__utm[a-z]|_gac_|AMP_TOKEN)/i, 'analytics', 'Google Analytics'],
    [/^(_hj|_hjSession)/i, 'analytics', 'Hotjar'],
    [/^(_clck|_clsk|CLID|MUID|SM|ANONCHK)$/i, 'analytics', 'Microsoft Clarity'],
    [/^(mp_|mixpanel)/i, 'analytics', 'Mixpanel'],
    [/^(amplitude_id|AMP_)/i, 'analytics', 'Amplitude'],
    [/^(ajs_)/i, 'analytics', 'Segment'],
    [/^(_pk_|_pk_id|_pk_ses|MATOMO)/i, 'analytics', 'Matomo'],
    [/^(s_cc|s_sq|s_vi|s_fid|AMCV_|AMCVS_|s_ecid)/i, 'analytics', 'Adobe Analytics'],
    [/^(nr_|NREUM|JSESSIONID_NR)/i, 'analytics', 'New Relic'],
    [/^(_gcl_|_gcl_au|IDE|DSID|test_cookie|__gads|__gpi|FPGCLAW|FPAU)/i, 'marketing', 'Google Ads'],
    [/^(_fbp|_fbc|fr)$/i, 'marketing', 'Meta / Facebook'],
    [/^(_uet|_uetsid|_uetvid|MUIDB)/i, 'marketing', 'Microsoft Ads'],
    [/^(_tt_|_ttp|tt_)/i, 'marketing', 'TikTok'],
    [/^(_pin_unauth|_pinterest_)/i, 'marketing', 'Pinterest'],
    [/^(_scid|_sctr|sc_at)/i, 'marketing', 'Snapchat'],
    [/^(li_|lidc|bcookie|bscookie|UserMatchHistory|AnalyticsSyncHistory|li_sugr)/i, 'marketing', 'LinkedIn'],
    [/^(personalization_id|guest_id|muc_ads)$/i, 'marketing', 'X / Twitter'],
    [/^(_rdt_uuid)/i, 'marketing', 'Reddit'],
    [/^(criteo|cto_)/i, 'marketing', 'Criteo'],
    [/^(_cs_|_hp2_|_dc_gtm_)/i, 'analytics', 'Etiquetas'],
    [/^(OptanonConsent|OptanonAlertBoxClosed|CookieConsent|didomi_token|euconsent|euconsent-v2|uc_settings|cmplz_|cookieyes-consent|borlabs-cookie|_iub_cs|klaro|osano_|CookieControl|cookie_consent|cookielawinfo|wp_consent|axeptio_|cookiefirst-consent|notice_preferences|TAconsentID|consentUUID|usprivacy|addtl_consent)/i, 'necessary', 'Registro de consentimiento'],
    [/^(PHPSESSID|JSESSIONID|ASP\.NET_SessionId|ASPSESSIONID|session|sessionid|sid|connect\.sid|laravel_session|ci_session|_session_id|XSRF-TOKEN|csrftoken|csrf_token|__Host-|__Secure-|wordpress_|wp-settings|cf_clearance|__cf_bm|__cfruid|_cfuvid|AWSALB|AWSALBCORS|incap_ses_|visid_incap_)/i, 'necessary', 'Sesión y seguridad'],
    [/^(lang|language|locale|i18n|currency|country|region|theme|timezone|pll_language)$/i, 'preferences', 'Preferencias del sitio']
  ];

  function classifyCookie(name) {
    for (const [re, cat, who] of KNOWN_COOKIES) if (re.test(name)) return { cat, who };
    return { cat: 'unknown', who: '' };
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[\s ]+/g, ' ').replace(/[«»"“”'’.,:;!¡?¿()\[\]→›>✓✔×✕]/g, '').trim();
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  // Busca la regla de sitio más específica: sub.dominio.cl → dominio.cl → cl
  function siteRule(settings, host) {
    if (!host) return null;
    const parts = host.replace(/^www\./, '').split('.');
    for (let i = 0; i < Math.max(1, parts.length - 1); i++) {
      const h = parts.slice(i).join('.');
      if (settings.sites && settings.sites[h]) return Object.assign({ host: h }, settings.sites[h]);
    }
    return null;
  }

  function effective(settings, host) {
    const site = siteRule(settings, host);
    let mode = (site && site.mode && site.mode !== 'global') ? site.mode : settings.mode;
    const off = !settings.enabled || mode === 'off';
    let cats;
    if (mode === 'accept') cats = { preferences: true, analytics: true, marketing: true };
    else if (mode === 'custom') cats = Object.assign({}, DEFAULTS.categories, (site && site.mode === 'custom' && site.categories) || settings.categories);
    else cats = { preferences: false, analytics: false, marketing: false };
    const allowed = CATS.filter(c => cats[c]).length;
    const action = allowed === 0 ? 'reject' : allowed === CATS.length ? 'accept' : 'custom';
    return { mode, off, cats, action, site };
  }

  function hideRulesFor(settings, host) {
    const out = [];
    if (!host || !settings.hideRules) return out;
    const parts = host.replace(/^www\./, '').split('.');
    for (let i = 0; i < Math.max(1, parts.length - 1); i++) {
      const list = settings.hideRules[parts.slice(i).join('.')];
      if (Array.isArray(list)) out.push(...list);
    }
    return out;
  }

  function merge(stored) {
    const s = Object.assign({}, DEFAULTS, stored || {});
    s.categories = Object.assign({}, DEFAULTS.categories, (stored && stored.categories) || {});
    s.sites = Object.assign({}, (stored && stored.sites) || {});
    s.hideRules = Object.assign({}, (stored && stored.hideRules) || {});
    return s;
  }

  async function getSettings() {
    try {
      const r = await api.storage.local.get('settings');
      return merge(r && r.settings);
    } catch (e) { return merge(null); }
  }

  async function saveSettings(s) {
    await api.storage.local.set({ settings: s });
    return s;
  }

  const ACTION_LABEL = {
    reject: 'Sólo necesarias',
    accept: 'Aceptado',
    custom: 'Personalizado',
    hidden: 'Oculto',
    none: 'Sin aviso',
    off: 'Pausado'
  };

  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fmtDuration(sec) {
    sec = Math.round(sec);
    if (sec < 60) return sec + ' s';
    const m = Math.floor(sec / 60);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    return h + ' h ' + (m % 60) + ' min';
  }

  function timeAgo(t) {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 10) return 'recién';
    if (s < 60) return 'hace ' + s + ' s';
    if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    return 'hace ' + Math.round(s / 86400) + ' d';
  }

  g.PC = {
    api, CATS, CAT_INFO, MODES, DEFAULTS, TRACKING_PARAMS, KNOWN_COOKIES, ACTION_LABEL,
    classifyCookie, norm, hostOf, siteRule, effective, hideRulesFor, merge,
    getSettings, saveSettings, dayKey, fmtDuration, timeAgo
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
