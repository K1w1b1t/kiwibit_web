'use client';

import posthog from 'posthog-js';

export type AnalyticsConsent = 'granted' | 'denied';
let initialized = false;
let consent: AnalyticsConsent | undefined;

function fixedProperties() {
  return { app: 'kiwibit', environment: environment(), telemetry_source: 'browser' } as const;
}

function environment() {
  const value = process.env.NEXT_PUBLIC_APP_ENV;
  return value === 'staging' || value === 'production' ? value : 'development';
}

function readConsent(): AnalyticsConsent | undefined {
  const value = document.cookie
    .split('; ')
    .find((item) => item.startsWith('analytics_consent='))
    ?.split('=')[1];
  return value === 'granted' || value === 'denied' ? value : undefined;
}

function initialize() {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (initialized || consent !== 'granted' || !token) return;
  try {
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      autocapture: true,
      capture_exceptions: true,
      capture_pageview: 'history_change',
      loaded: (client) => {
        client.register(fixedProperties());
      },
      sanitize_properties: (properties) => {
        for (const key of ['$current_url', '$referrer', '$prev_pageview_pathname']) {
          if (typeof properties[key] === 'string') properties[key] = properties[key].split('?')[0];
        }
        return properties;
      },
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '*',
        recordHeaders: false,
        recordBody: false,
        maskCapturedNetworkRequestFn: (request) => {
          if (request.name) request.name = request.name.split('?')[0];
          return request;
        },
      },
    });
    initialized = true;
  } catch {
    initialized = false;
  }
}

export function initializeAnalyticsFromConsent() {
  consent = readConsent();
  initialize();
  return consent;
}
export function setAnalyticsConsent(value: AnalyticsConsent) {
  consent = value;
  document.cookie = `analytics_consent=${value}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${environment() === 'production' ? '; Secure' : ''}`;
  if (value === 'granted') {
    try {
      posthog.opt_in_capturing();
    } catch {}
    initialize();
    window.dispatchEvent(new Event('analytics-consent-granted'));
    return;
  }
  try {
    posthog.stopSessionRecording();
  } catch {}
  try {
    posthog.reset();
  } catch {}
  try {
    posthog.opt_out_capturing();
  } catch {}
  initialized = false;
}
export function identifyAnalyticsUser(id: string) {
  if (consent !== 'granted') consent = readConsent();
  initialize();
  if (!initialized) return;
  try {
    posthog.identify(id);
  } catch {}
}
export function resetAnalyticsUser() {
  try {
    posthog.reset();
    if (initialized && consent === 'granted') posthog.register(fixedProperties());
  } catch {}
}
export type BrowserAnalyticsEvent = 'user_logged_in' | 'post_created' | 'contact_form_submitted';
export function captureAnalyticsEvent(event: BrowserAnalyticsEvent): boolean {
  if (consent !== 'granted') consent = readConsent();
  initialize();
  if (!initialized) return false;
  try {
    posthog.capture(event, fixedProperties());
    return true;
  } catch {
    return false;
  }
}
export function captureBrowserException(error: unknown) {
  initializeAnalyticsFromConsent();
  if (initialized) {
    try {
      posthog.captureException(error, fixedProperties());
    } catch {}
  }
}
