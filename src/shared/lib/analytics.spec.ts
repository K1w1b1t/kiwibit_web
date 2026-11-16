/** @jest-environment jsdom */
import posthog from 'posthog-js';
import {
  captureAnalyticsEvent,
  captureBrowserException,
  initializeAnalyticsFromConsent,
  setAnalyticsConsent,
} from './analytics';

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
    stopSessionRecording: jest.fn(),
    reset: jest.fn(),
    capture: jest.fn(),
    captureException: jest.fn(),
  },
}));

describe('Browser consent enforcement', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'test-token';
    setAnalyticsConsent('denied');
    document.cookie = 'analytics_consent=; Max-Age=0; Path=/';
    jest.clearAllMocks();
  });
  afterEach(() => {
    setAnalyticsConsent('denied');
    document.cookie = 'analytics_consent=; Max-Age=0; Path=/';
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  });

  it.each(['', 'invalid', 'denied'])('keeps telemetry disabled with cookie value %s', (value) => {
    if (value) document.cookie = `analytics_consent=${value}; Path=/`;
    expect(initializeAnalyticsFromConsent()).toBe(value === 'denied' ? 'denied' : undefined);
    expect(captureAnalyticsEvent('user_logged_in')).toBe(false);
    captureBrowserException(new Error('Synthetic test'));
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.captureException).not.toHaveBeenCalled();
  });

  it('resumes with saved explicit consent', () => {
    document.cookie = 'analytics_consent=granted; Path=/';
    expect(initializeAnalyticsFromConsent()).toBe('granted');
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it('stops recording and capturing on withdrawal', () => {
    setAnalyticsConsent('granted');
    expect(posthog.init).toHaveBeenCalledTimes(1);
    setAnalyticsConsent('denied');
    expect(posthog.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(posthog.reset).toHaveBeenCalledTimes(1);
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(captureAnalyticsEvent('user_logged_in')).toBe(false);
    captureBrowserException(new Error('Synthetic test'));
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.captureException).not.toHaveBeenCalled();
  });
});
