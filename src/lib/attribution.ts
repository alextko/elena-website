const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const COOKIE_NAME = 'elena_attribution';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
  landing_page?: string;
  referrer?: string;
  first_visit?: string;
}

export function captureAttribution(): AttributionData {
  if (typeof window === 'undefined') return {};

  const url = new URL(window.location.href);
  const params = url.searchParams;

  const hasNewUtms = UTM_PARAMS.some(key => params.has(key));
  const existingAttribution = getStoredAttribution();

  if (hasNewUtms || !existingAttribution) {
    const data: AttributionData = {
      ...(!hasNewUtms ? existingAttribution : {}),
    };

    for (const key of UTM_PARAMS) {
      const value = params.get(key);
      if (value) data[key] = value;
    }

    const ref = params.get('ref');
    if (ref) data.ref = ref;

    if (!existingAttribution?.landing_page) {
      data.landing_page = window.location.pathname;
    }

    if (!existingAttribution?.referrer && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.hostname !== window.location.hostname) {
          data.referrer = document.referrer;
        }
      } catch {}
    }

    if (!existingAttribution?.first_visit) {
      data.first_visit = new Date().toISOString();
    }

    setCookie(data);
    registerWithMixpanel(data);
    return data;
  }

  registerWithMixpanel(existingAttribution);
  return existingAttribution;
}

export function getStoredAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')
      .slice(1)
      .join('=');
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function isMixpanelReady(): boolean {
  // The stub sets __SV=1.2 but the real library replaces the stub object
  // with a real one that has get_config as a function. The stub's get_config
  // is just a push-based placeholder that throws "a.push is not a function".
  const mp = (window as any).mixpanel;
  if (!mp) return false;
  try {
    // This call will throw on the stub but succeed on the real library
    mp.get_config('token');
    return true;
  } catch {
    return false;
  }
}

function registerWithMixpanel(data: AttributionData) {
  if (typeof window === 'undefined') return;

  const props: Record<string, string> = {};
  if (data.utm_source) props['utm_source'] = data.utm_source;
  if (data.utm_medium) props['utm_medium'] = data.utm_medium;
  if (data.utm_campaign) props['utm_campaign'] = data.utm_campaign;
  if (data.utm_content) props['utm_content'] = data.utm_content;
  if (data.utm_term) props['utm_term'] = data.utm_term;
  if (data.ref) props['ref'] = data.ref;
  if (data.landing_page) props['landing_page'] = data.landing_page;
  if (data.referrer) props['referrer'] = data.referrer;

  if (Object.keys(props).length === 0) return;

  const doRegister = () => {
    try {
      const mp = (window as any).mixpanel;
      if (!mp) return;
      mp.register(props);

      const firstTouchProps: Record<string, string> = {};
      for (const [key, value] of Object.entries(props)) {
        firstTouchProps[`initial_${key}`] = value;
      }
      if (data.first_visit) firstTouchProps['first_visit'] = data.first_visit;
      if (Object.keys(firstTouchProps).length > 0) {
        mp.people.set_once(firstTouchProps);
      }
    } catch {
      // Safe to ignore -- cookie has the data regardless
    }
  };

  // Poll for the real library to load (checks every 200ms, gives up after 5s)
  if (isMixpanelReady()) {
    doRegister();
  } else {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (isMixpanelReady()) {
        clearInterval(interval);
        doRegister();
      } else if (attempts >= 25) {
        clearInterval(interval);
      }
    }, 200);
  }
}

function setCookie(data: AttributionData) {
  const encoded = encodeURIComponent(JSON.stringify(data));
  document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
