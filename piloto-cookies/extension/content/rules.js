/* Piloto de Cookies: base de plataformas de consentimiento (CMP) reconocidas.
 *
 * Cada regla:
 *   id, name     identificador y nombre visible
 *   detect       selector del aviso visible
 *   prehide      selectores que se ocultan desde el inicio para evitar el parpadeo
 *   api          manejador en el contexto de la página (page.js), se intenta antes que los clics
 *   host         (opcional) expresión regular del dominio donde aplica
 *   reject/accept  pasos para "sólo necesarias" / "aceptar todo"
 *   custom(cats)   pasos para elegir categorías; si falta se usa reject
 *
 * Pasos: {click: sel, optional, timeout}, {toggle: sel, on: bool}, {wait: sel}, {sleep: ms}
 */
(function (g) {
  'use strict';
  const T = (sel, on) => ({ toggle: sel, on: !!on });

  g.PC_RULES = [
    {
      id: 'onetrust', name: 'OneTrust',
      detect: '#onetrust-banner-sdk, #onetrust-pc-sdk',
      prehide: '#onetrust-consent-sdk, #onetrust-banner-sdk, .onetrust-pc-dark-filter',
      api: 'onetrust',
      reject: [
        { click: '#onetrust-reject-all-handler, .ot-pc-refuse-all-handler, button.ot-pc-refuse-all-handler', optional: true, timeout: 600 },
        { click: '#onetrust-pc-btn-handler, .ot-sdk-show-settings', optional: true, timeout: 400, onlyIfVisible: '#onetrust-banner-sdk' },
        { toggle: '#onetrust-pc-sdk input.category-switch-handler, #onetrust-pc-sdk input[id^="ot-group-id-"]:not([disabled])', on: false },
        { click: '#onetrust-pc-sdk .save-preference-btn-handler, #onetrust-pc-sdk .ot-pc-refuse-all-handler', optional: true, timeout: 800 }
      ],
      accept: [{ click: '#onetrust-accept-btn-handler, #accept-recommended-btn-handler' }],
      custom: c => [
        { click: '#onetrust-pc-btn-handler', timeout: 1500 },
        { wait: '#onetrust-pc-sdk', timeout: 1500 },
        T('#ot-group-id-C0002, #onetrust-pc-sdk input[id$="C0002"]', c.analytics),
        T('#ot-group-id-C0003, #onetrust-pc-sdk input[id$="C0003"]', c.preferences),
        T('#ot-group-id-C0004, #onetrust-pc-sdk input[id$="C0004"]', c.marketing),
        T('#ot-group-id-C0005, #onetrust-pc-sdk input[id$="C0005"]', c.marketing),
        { click: '#onetrust-pc-sdk .save-preference-btn-handler' }
      ]
    },
    {
      id: 'cookiebot', name: 'Cookiebot',
      detect: '#CybotCookiebotDialog, #CookiebotWidget-not-visible-placeholder',
      prehide: '#CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay',
      api: 'cookiebot',
      reject: [{ click: '#CybotCookiebotDialogBodyButtonDecline, #CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll' }],
      accept: [{ click: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, #CybotCookiebotDialogBodyButtonAccept' }],
      custom: c => [
        { click: '#CybotCookiebotDialogBodyButtonDetails, #CybotCookiebotDialogNavDetails', optional: true, timeout: 800 },
        T('#CybotCookiebotDialogBodyLevelButtonPreferences, #CybotCookiebotDialogBodyLevelButtonPreferencesInline', c.preferences),
        T('#CybotCookiebotDialogBodyLevelButtonStatistics, #CybotCookiebotDialogBodyLevelButtonStatisticsInline', c.analytics),
        T('#CybotCookiebotDialogBodyLevelButtonMarketing, #CybotCookiebotDialogBodyLevelButtonMarketingInline', c.marketing),
        { click: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection, #CybotCookiebotDialogBodyButtonAcceptSelected' }
      ]
    },
    {
      id: 'didomi', name: 'Didomi',
      detect: '#didomi-popup .didomi-popup-container, #didomi-notice',
      prehide: '#didomi-host, .didomi-popup-backdrop',
      api: 'didomi',
      reject: [
        { click: '#didomi-notice-disagree-button, .didomi-continue-without-agreeing, #didomi-notice-learn-more-button ~ button[aria-label*="Rechaz" i]', optional: true, timeout: 800 },
        { click: '#didomi-notice-learn-more-button', optional: true, timeout: 400 },
        { click: '.didomi-consent-popup-actions button[aria-label*="isagree" i], button.didomi-components-radio__option[aria-describedby="didomi-consent-popup-disagree"]', optional: true, timeout: 600 },
        { click: 'button[aria-label*="Rechazar todo" i], button[aria-label*="Disagree to all" i]', optional: true, timeout: 400 },
        { click: '.didomi-consent-popup-actions .didomi-components-button--color', optional: true, timeout: 400 }
      ],
      accept: [{ click: '#didomi-notice-agree-button' }]
    },
    {
      id: 'usercentrics', name: 'Usercentrics',
      detect: '[data-testid="uc-deny-all-button"], [data-testid="uc-accept-all-button"], #uc-center-container, #usercentrics-cmp-ui [role="dialog"]',
      prehide: '#usercentrics-root, #usercentrics-cmp-ui',
      api: 'usercentrics',
      reject: [{ click: '[data-testid="uc-deny-all-button"], #deny, .uc-deny-button, button[data-action-type="deny"]' }],
      accept: [{ click: '[data-testid="uc-accept-all-button"], #accept, button[data-action-type="accept"]' }]
    },
    {
      id: 'quantcast', name: 'Quantcast Choice (TCF)',
      detect: '.qc-cmp2-container .qc-cmp2-summary-buttons, #qc-cmp2-ui',
      prehide: '.qc-cmp2-container, #qc-cmp2-container',
      reject: [
        { click: '.qc-cmp2-summary-buttons button[mode="secondary"], .qc-cmp2-summary-buttons button:not([mode="primary"])', timeout: 800 },
        { click: '.qc-cmp2-header-links button[mode="link"]:first-child', optional: true, timeout: 600 },
        { click: '.qc-cmp2-buttons-desktop button[mode="secondary"], .qc-cmp2-footer button[mode="secondary"]', optional: true, timeout: 800 }
      ],
      accept: [{ click: '.qc-cmp2-summary-buttons button[mode="primary"]' }]
    },
    {
      id: 'sourcepoint', name: 'Sourcepoint',
      detect: '.message-container .message-component, .sp_choice_type_11, .sp_choice_type_13',
      reject: [
        { click: '.sp_choice_type_13, button[title*="Rechazar" i], button[title*="Reject" i], button[title*="Ablehnen" i], button[title*="Refuser" i]', optional: true, timeout: 800 },
        { click: '.sp_choice_type_12', optional: true, timeout: 500 },
        { click: '.sp_choice_type_REJECT_ALL, button.sp_choice_type_SAVE_AND_EXIT', optional: true, timeout: 900 }
      ],
      accept: [{ click: '.sp_choice_type_11' }]
    },
    {
      id: 'trustarc', name: 'TrustArc',
      detect: '#truste-consent-track, #truste-consent-content, .truste_box_overlay',
      prehide: '#truste-consent-track, .truste_overlay, .truste_box_overlay',
      reject: [{ click: '#truste-consent-required, .truste-consent-required, #truste-consent-required2' }],
      accept: [{ click: '#truste-consent-button' }]
    },
    {
      id: 'cookieyes', name: 'CookieYes',
      detect: '.cky-consent-container:not(.cky-hide), .cky-modal.cky-modal-open',
      prehide: '.cky-consent-container, .cky-overlay',
      reject: [{ click: '.cky-btn-reject' }],
      accept: [{ click: '.cky-btn-accept' }],
      custom: c => [
        { click: '.cky-btn-customize', timeout: 1000 },
        T('#ckySwitchfunctional', c.preferences),
        T('#ckySwitchanalytics, #ckySwitchperformance', c.analytics),
        T('#ckySwitchadvertisement, #ckySwitchmarketing', c.marketing),
        { click: '.cky-btn-preferences' }
      ]
    },
    {
      id: 'complianz', name: 'Complianz',
      detect: '.cmplz-cookiebanner:not(.cmplz-hidden), #cmplz-cookiebanner-container .cmplz-show',
      prehide: '.cmplz-cookiebanner, #cmplz-cookiebanner-container',
      reject: [{ click: '.cmplz-deny, .cc-deny' }],
      accept: [{ click: '.cmplz-accept, .cc-allow' }],
      custom: c => [
        { click: '.cmplz-view-preferences, .cmplz-manage-options', optional: true, timeout: 800 },
        T('input.cmplz-consent-checkbox.cmplz-preferences, input[data-category="cmplz_preferences"], input[data-category="cmplz_functional"]', c.preferences),
        T('input.cmplz-consent-checkbox.cmplz-statistics, input[data-category="cmplz_statistics"]', c.analytics),
        T('input.cmplz-consent-checkbox.cmplz-marketing, input[data-category="cmplz_marketing"]', c.marketing),
        { click: '.cmplz-save-preferences' }
      ]
    },
    {
      id: 'osano', name: 'Osano',
      detect: '.osano-cm-dialog:not(.osano-cm-dialog--hidden), .osano-cm-info-dialog:not(.osano-cm-info-dialog--hidden)',
      prehide: '.osano-cm-dialog, .osano-cm-window__dialog',
      reject: [{ click: '.osano-cm-denyAll, .osano-cm-button--type_denyAll' }],
      accept: [{ click: '.osano-cm-accept-all, .osano-cm-button--type_accept' }],
      custom: c => [
        { click: '.osano-cm-button--type_manage, .osano-cm-manage', timeout: 900 },
        T('.osano-cm-toggle__input[data-category="PERSONALIZATION"], input[data-category="PERSONALIZATION"]', c.preferences),
        T('input[data-category="ANALYTICS"]', c.analytics),
        T('input[data-category="MARKETING"]', c.marketing),
        { click: '.osano-cm-button--type_save, .osano-cm-save' }
      ]
    },
    {
      id: 'klaro', name: 'Klaro',
      detect: '.klaro .cookie-notice:not(.cookie-notice-hidden), .klaro .cookie-modal',
      prehide: '.klaro .cookie-notice, .klaro .cookie-modal',
      api: 'klaro',
      reject: [{ click: '.klaro .cn-decline, .klaro .cm-btn-decline' }],
      accept: [{ click: '.klaro .cm-btn-accept-all, .klaro .cm-btn-success' }]
    },
    {
      id: 'iubenda', name: 'iubenda',
      detect: '#iubenda-cs-banner',
      prehide: '#iubenda-cs-banner',
      reject: [{ click: '.iubenda-cs-reject-btn, #iubenda-cs-banner .iubenda-cs-close-btn' }],
      accept: [{ click: '.iubenda-cs-accept-btn' }]
    },
    {
      id: 'termly', name: 'Termly',
      detect: '[data-tid="banner-decline"], #termly-code-snippet-support [class*="termly-styles-root"]',
      reject: [{ click: '[data-tid="banner-decline"]' }],
      accept: [{ click: '[data-tid="banner-accept"]' }]
    },
    {
      id: 'borlabs', name: 'Borlabs Cookie',
      detect: '#BorlabsCookieBox ._brlbs-block-content, #BorlabsCookieBox [role="dialog"], .brlbs-cmpnt-dialog',
      prehide: '#BorlabsCookieBox, #BorlabsCookieBoxWrap',
      reject: [{ click: 'a[data-cookie-refuse], ._brlbs-refuse-btn a, .brlbs-btn-accept-only-essential, ._brlbs-refuse a' }],
      accept: [{ click: 'a[data-cookie-accept-all], ._brlbs-btn-accept-all a, .brlbs-btn-accept-all' }]
    },
    {
      id: 'cookiefirst', name: 'CookieFirst',
      detect: '[data-cookiefirst-widget="box"], .cookiefirst-root',
      reject: [{ click: '[data-cookiefirst-action="reject"]' }],
      accept: [{ click: '[data-cookiefirst-action="accept"]' }]
    },
    {
      id: 'axeptio', name: 'Axeptio',
      detect: '#axeptio_overlay .axeptio_widget, #axeptio_main_button',
      prehide: '#axeptio_overlay',
      reject: [{ click: '#axeptio_btn_dismiss' }],
      accept: [{ click: '#axeptio_btn_acceptAll' }]
    },
    {
      id: 'consentmanager', name: 'consentmanager',
      detect: '#cmpbox, #cmpwrapper',
      prehide: '#cmpbox, #cmpbox2, #cmpwrapper',
      api: 'consentmanager',
      reject: [{ click: '.cmpboxbtnno, a.cmpboxbtn.cmpboxbtnno, .cmptxt_btn_no' }],
      accept: [{ click: '.cmpboxbtnyes, .cmptxt_btn_yes' }]
    },
    {
      id: 'fundingchoices', name: 'Google Funding Choices',
      detect: '.fc-consent-root .fc-dialog, .fc-consent-root',
      prehide: '.fc-consent-root',
      reject: [
        { click: '.fc-cta-do-not-consent', optional: true, timeout: 700 },
        { click: '.fc-cta-manage-options', optional: true, timeout: 500 },
        { click: '.fc-confirm-choices, .fc-data-preferences-dialog .fc-button-label', optional: true, timeout: 900 }
      ],
      accept: [{ click: '.fc-cta-consent' }]
    },
    {
      id: 'civic', name: 'Civic Cookie Control',
      detect: '#ccc #ccc-notify, #ccc[role="dialog"], #ccc-module',
      prehide: '#ccc, #ccc-overlay',
      reject: [{ click: '#ccc-reject-settings, #ccc-notify-reject' }],
      accept: [{ click: '#ccc-notify-accept, #ccc-recommended-settings' }]
    },
    {
      id: 'evidon', name: 'Evidon',
      detect: '#_evidon_banner, #_evidon-banner',
      prehide: '#_evidon_banner, #_evidon-banner, #evidon-prefdiag-overlay',
      reject: [{ click: '#_evidon-decline-button' }],
      accept: [{ click: '#_evidon-accept-button' }]
    },
    {
      id: 'tarteaucitron', name: 'tarteaucitron',
      detect: '#tarteaucitronAlertBig',
      prehide: '#tarteaucitronRoot',
      reject: [{ click: '#tarteaucitronAllDenied2, .tarteaucitronDeny' }],
      accept: [{ click: '#tarteaucitronPersonalize2, .tarteaucitronAllow' }]
    },
    {
      id: 'cookieinformation', name: 'Cookie Information',
      detect: '#coiOverlay, #cookie-information-template-wrapper',
      prehide: '#coiOverlay',
      reject: [{ click: '.coi-banner__decline, #declineButton' }],
      accept: [{ click: '.coi-banner__accept, #updateButton' }]
    },
    {
      id: 'cookiescript', name: 'Cookie-Script',
      detect: '#cookiescript_injected',
      prehide: '#cookiescript_injected, #cookiescript_injected_wrapper',
      reject: [{ click: '#cookiescript_reject' }],
      accept: [{ click: '#cookiescript_accept' }]
    },
    {
      id: 'cookielawinfo', name: 'CookieYes (GDPR Cookie Consent)',
      detect: '#cookie-law-info-bar, #cliSettingsPopup.cli-show',
      prehide: '#cookie-law-info-bar, .cli-modal-backdrop',
      reject: [{ click: '#cookie_action_close_header_reject, .cookie_action_close_header_reject, .cli_action_button[data-cli_action="reject"]' }],
      accept: [{ click: '#wt-cli-accept-all-btn, #cookie_action_close_header, .cli_action_button[data-cli_action="accept_all"]' }]
    },
    {
      id: 'moove', name: 'GDPR Cookie Compliance (Moove)',
      detect: '#moove_gdpr_cookie_info_bar:not(.moove-gdpr-info-bar-hidden)',
      prehide: '#moove_gdpr_cookie_info_bar',
      reject: [{ click: '.moove-gdpr-infobar-reject-btn' }],
      accept: [{ click: '.moove-gdpr-infobar-allow-all' }]
    },
    {
      id: 'cookienotice', name: 'Cookie Notice',
      detect: '#cookie-notice.cookie-notice-visible, #cookie-notice',
      reject: [{ click: '#cn-refuse-cookie' }],
      accept: [{ click: '#cn-accept-cookie' }]
    },
    {
      id: 'hubspot', name: 'HubSpot',
      detect: '#hs-eu-cookie-confirmation',
      prehide: '#hs-eu-cookie-confirmation',
      reject: [{ click: '#hs-eu-decline-button' }],
      accept: [{ click: '#hs-eu-confirmation-button' }]
    },
    {
      id: 'shopify', name: 'Shopify',
      detect: '.shopify-pc__banner__dialog, #shopify-pc__banner',
      prehide: '#shopify-pc__banner',
      reject: [{ click: '.shopify-pc__banner__btn-decline, #shopify-pc__banner__btn-decline' }],
      accept: [{ click: '.shopify-pc__banner__btn-accept, #shopify-pc__banner__btn-accept' }]
    },
    {
      id: 'wix', name: 'Wix',
      detect: '[data-hook="consent-banner-root"]',
      reject: [{ click: '[data-hook="consent-banner-decline-button"]' }],
      accept: [{ click: '[data-hook="consent-banner-apply-button"]' }]
    },
    {
      id: 'ketch', name: 'Ketch',
      detect: '#lanyard_root [role="dialog"]',
      reject: [{ click: '#lanyard_root button[aria-label*="Reject" i], #lanyard_root button[aria-label*="Rechaz" i]' }],
      accept: [{ click: '#lanyard_root button[aria-label*="Accept" i], #lanyard_root button[aria-label*="Acept" i]' }]
    },
    {
      id: 'cookieconsent', name: 'Cookie Consent (Osano/insites)',
      detect: '.cc-window:not(.cc-invisible), .cc-banner:not(.cc-invisible)',
      prehide: '.cc-window',
      reject: [{ click: '.cc-window .cc-deny, .cc-window .cc-dismiss' }],
      accept: [{ click: '.cc-window .cc-allow, .cc-window .cc-dismiss' }]
    },
    {
      id: 'orestbida', name: 'CookieConsent (Orest Bida)',
      detect: '#cc-main .cm, #cc--main #cm, #cc_div #cm',
      prehide: '#cc-main, #cc--main',
      reject: [{ click: '#cc-main [data-role="necessary"], #cc--main #c-s-bn, #cc_div #c-s-bn, #cc-main .cm__btn[data-role="necessary"]' }],
      accept: [{ click: '#cc-main [data-role="all"], #cc--main #c-p-bn, #cc_div #c-p-bn' }]
    },
    // ——— Sitios grandes con aviso propio ———
    {
      id: 'google', name: 'Google', host: /(^|\.)google\.[a-z.]+$|(^|\.)consent\.google\.[a-z.]+$/,
      detect: '#W0wltc, #L2AGLb, form[action*="consent.google"] button',
      reject: [{ click: '#W0wltc, form[action*="consent.google"]:first-of-type button, button[aria-label^="Rechazar" i], button[aria-label^="Reject" i]' }],
      accept: [{ click: '#L2AGLb, button[aria-label^="Aceptar" i], button[aria-label^="Accept" i]' }]
    },
    {
      id: 'youtube', name: 'YouTube', host: /(^|\.)youtube\.com$/,
      detect: 'ytd-consent-bump-v2-lightbox tp-yt-paper-dialog, ytm-consent-bump-v2-renderer',
      reject: [{ click: 'ytd-consent-bump-v2-lightbox button[aria-label*="Rechazar" i], ytd-consent-bump-v2-lightbox button[aria-label*="Reject" i], ytm-consent-bump-v2-renderer button[aria-label*="Rechazar" i], ytm-consent-bump-v2-renderer button[aria-label*="Reject" i]' }],
      accept: [{ click: 'ytd-consent-bump-v2-lightbox button[aria-label*="Aceptar" i], ytd-consent-bump-v2-lightbox button[aria-label*="Accept" i], ytm-consent-bump-v2-renderer button[aria-label*="Accept" i]' }]
    },
    {
      id: 'amazon', name: 'Amazon', host: /(^|\.)amazon\.[a-z.]+$/,
      detect: '#sp-cc, #sp-cc-wrapper',
      reject: [{ click: '#sp-cc-rejectall-link' }],
      accept: [{ click: '#sp-cc-accept' }]
    },
    {
      id: 'meta', name: 'Facebook / Instagram', host: /(^|\.)(facebook|instagram|threads)\.(com|net)$/,
      detect: '[data-cookiebanner="banner"], div[role="dialog"] [data-cookiebanner]',
      reject: [{ click: '[data-cookiebanner="accept_only_essential_button"], div[role="dialog"] button._a9_1' }],
      accept: [{ click: '[data-cookiebanner="accept_button"], div[role="dialog"] button._a9--' }]
    },
    {
      id: 'microsoft', name: 'Microsoft / Bing', host: /(^|\.)(bing|microsoft|msn|live|office)\.(com|net)$/,
      detect: '#bnp_container, #wcpConsentBannerCtrl, #cookie-banner',
      reject: [{ click: '#bnp_btn_reject, #wcpConsentBannerCtrl button:nth-child(2)' }],
      accept: [{ click: '#bnp_btn_accept, #wcpConsentBannerCtrl button:first-child' }]
    },
    {
      id: 'linkedin', name: 'LinkedIn', host: /(^|\.)linkedin\.com$/,
      detect: '#artdeco-global-alert-container .artdeco-global-alert--COOKIE_CONSENT, [data-test-global-alert-type="COOKIE_CONSENT"]',
      reject: [{ click: 'button[action-type="DENY"]' }],
      accept: [{ click: 'button[action-type="ACCEPT"]' }]
    },
    {
      id: 'reddit', name: 'Reddit', host: /(^|\.)reddit\.com$/,
      detect: 'reddit-cookie-banner, shreddit-async-loader[bundlename="cookie_banner"]',
      reject: [{ click: '#reject-nonessential-cookies-button button, reddit-cookie-banner button[id*="reject" i]' }],
      accept: [{ click: '#accept-all-cookies-button button' }]
    }
  ];

  // Palabras del aviso y de los botones (texto normalizado, sin tildes)
  g.PC_WORDS = {
    banner: /\b(cookies?|galletas|consent\w*|consentimiento|consentement|einwilligung|zustimmung|gdpr|rgpd|dsgvo|lgpd|tcf)\b/,
    reject: [
      /^(rechazar|rechazo|denegar|no aceptar|no acepto|no gracias|no, gracias|rehusar|declinar)( (todo|todas|todos|cookies|todas las cookies|las cookies|opcionales|no esenciales|cookies opcionales|cookies no esenciales|y cerrar))?$/,
      /^(solo|usar solo|aceptar solo|permitir solo|continuar con|aceptar unicamente|solo aceptar|utilizar solo|usar unicamente)( las)?( cookies)? (necesarias|esenciales|imprescindibles|requeridas|tecnicas|estrictamente necesarias)( cookies)?$/,
      /^(cookies )?(necesarias|esenciales) (solamente|unicamente)$/,
      /^continuar sin (aceptar|consentir)$/,
      /^(reject|decline|deny|refuse|disagree)( all| all cookies| cookies| optional cookies| non-essential cookies| and close| non essential cookies)?$/,
      /^(i )?(do not|dont) (accept|agree|consent)$/,
      /^(only|use only|accept only|allow only)( the)? (necessary|essential|required|strictly necessary)( cookies)?$/,
      /^(necessary|essential|required) (cookies )?only$/,
      /^continue without (accepting|agreeing|consent)$/,
      /^(alle )?ablehnen$|^nur (notwendige|essenzielle|erforderliche)( cookies)?( akzeptieren| zulassen)?$/,
      /^(tout )?refuser( tout)?$|^continuer sans accepter$|^(je )?refuse$/,
      /^rifiuta( tutto| tutti)?$|^(rejeitar|recusar)( tudo| todos)?$|^(alles )?weigeren$|^avvisa alla$|^afvis alle$/
    ],
    accept: [
      /^(aceptar|acepto|aceptarlas|permitir|admitir|estoy de acuerdo|de acuerdo|entendido|vale|ok|okay|continuar)( todo| todas| todos| cookies| todas las cookies| las cookies| y cerrar| y continuar)?$/,
      /^(accept|allow|agree|i agree|i accept|got it|ok|okay|understood|consent)( all| all cookies| cookies| and close| and continue)?$/,
      /^(alle )?(akzeptieren|zulassen|annehmen)$|^(tout )?accepter( tout)?$|^accetta( tutto| tutti)?$|^(aceitar|concordo)( tudo| todos)?$/
    ]
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
