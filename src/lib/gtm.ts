// Mesmo comportamento das calculadoras de escala 6x1 e de VR/VA, com o mesmo contêiner.
export const GTM_ID = 'GTM-MVG6SHN2';
const CHOICE_KEY = 'cd2-cookies';

export type CookieChoice = 'aceito' | 'recusado';

const consent = (value: 'granted' | 'denied') => ({
  ad_storage: value,
  analytics_storage: value,
  ad_user_data: value,
  ad_personalization: value,
});

function dataLayer(): unknown[] {
  const holder = window as Window & { dataLayer?: unknown[] };
  holder.dataLayer = holder.dataLayer || [];
  return holder.dataLayer;
}

/** O GTM só entende o modo de consentimento quando recebe um objeto `arguments`, como no gtag oficial. */
function gtag(..._command: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  dataLayer().push(arguments);
}

export function readCookieChoice(): CookieChoice | null {
  try {
    const value = localStorage.getItem(CHOICE_KEY);
    return value === 'aceito' || value === 'recusado' ? value : null;
  } catch {
    return null;
  }
}

export function saveCookieChoice(choice: CookieChoice): void {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch {
    /* Sem armazenamento a escolha vale só nesta visita. */
  }
  gtag('consent', 'update', consent(choice === 'aceito' ? 'granted' : 'denied'));
}

/** Só nomes e valores fixos do catálogo entram no dataLayer. */
export function trackClicks(): void {
  document.addEventListener('click', (event) => {
    const el = (event.target as Element).closest<HTMLElement>('[data-track]');
    if (!el) return;
    const { track: name, recurso, origem } = el.dataset;
    const local = el.closest('[data-catalog]') ? 'catalogo' : 'destaques';
    dataLayer().push({ event: name, local, ...(recurso && { recurso }), ...(origem && { origem }) });
  });
}

/** O GTM carrega sempre, com tudo negado até o aceite, e só entra depois que a página terminou de carregar. */
export function startTagManager(): void {
  gtag('consent', 'default', { ...consent('denied'), wait_for_update: 500 });
  if (readCookieChoice() === 'aceito') gtag('consent', 'update', consent('granted'));
  dataLayer().push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const load = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(script);
  };
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 3000 });
    else window.setTimeout(load, 1500);
  };
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}
