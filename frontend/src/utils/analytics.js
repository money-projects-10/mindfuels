/**
 * Google Analytics 4, switched on only when VITE_GA_MEASUREMENT_ID is set at build time
 * (e.g. G-XXXXXXXXXX) and only in production builds. The tag loads after the page has
 * finished loading so it never slows the first view on a phone.
 */
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const enabled = Boolean(GA_ID) && import.meta.env.PROD;
let started = false;

export function initAnalytics() {
  if (!enabled || started) return;
  started = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // Page views are sent by trackPageView, because this app changes pages without reloading
  window.gtag('config', GA_ID, { send_page_view: false });

  const load = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(script);
  };
  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load, { once: true });
}

// Called after every in-app page change; the short delay lets the page set its own title first
export function trackPageView() {
  if (!enabled) return;
  setTimeout(() => {
    window.gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
    });
  }, 300);
}
