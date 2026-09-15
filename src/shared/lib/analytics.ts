'use client';

import posthog from 'posthog-js';

export type AnalyticsConsent = 'granted' | 'denied';
let initialized = false;
let consent: AnalyticsConsent | undefined;
const fixed = { app: 'kiwibit', telemetry_source: 'browser' } as const;

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
      capture_pageview: true,
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
  if (value === 'granted') return initialize();
  try {
    posthog.stopSessionRecording();
  } catch {}
  try {
    posthog.opt_out_capturing();
  } catch {}
  try {
    posthog.reset();
  } catch {}
  initialized = false;
}
export function identifyAnalyticsUser(id: string) {
  if (consent === 'granted' && initialized) {
    try {
      posthog.identify(id);
    } catch {}
  }
}
export function resetAnalyticsUser() {
  try {
    posthog.reset();
  } catch {}
}
export function captureBrowserException(error: unknown) {
  initializeAnalyticsFromConsent();
  if (initialized) {
    try {
      posthog.captureException(error, { ...fixed, environment: environment() });
    } catch {}
  }
}
