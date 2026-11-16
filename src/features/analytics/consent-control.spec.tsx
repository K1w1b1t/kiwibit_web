/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { initializeAnalyticsFromConsent, setAnalyticsConsent } from '@/shared/lib/analytics';
import { AnalyticsConsentControl } from './consent-control';

jest.mock('@/shared/lib/analytics', () => ({
  initializeAnalyticsFromConsent: jest.fn(),
  setAnalyticsConsent: jest.fn(),
}));

const dict = getDictionary('en').analytics;
const control = <AnalyticsConsentControl dict={dict} cookiePolicyHref="/en/cookies-policy" />;
const resolveConsent = () => act(() => jest.runOnlyPendingTimers());

describe('Analytics consent control', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(initializeAnalyticsFromConsent).mockReturnValue(undefined);
  });
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('distinguishes unresolved consent from confirmed missing consent', () => {
    render(control);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(initializeAnalyticsFromConsent).not.toHaveBeenCalled();
    resolveConsent();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it.each(['granted', 'denied'] as const)(
    'never automatically opens for saved %s consent, including remounts',
    (value) => {
      jest.mocked(initializeAnalyticsFromConsent).mockReturnValue(value);
      const first = render(control);
      expect(screen.queryByRole('dialog')).toBeNull();
      resolveConsent();
      expect(screen.queryByRole('dialog')).toBeNull();
      first.unmount();
      render(control);
      expect(screen.queryByRole('dialog')).toBeNull();
      resolveConsent();
      expect(screen.queryByRole('dialog')).toBeNull();
    },
  );

  it('allows explicit opening even before the check completes', () => {
    jest.mocked(initializeAnalyticsFromConsent).mockReturnValue('denied');
    render(control);
    fireEvent.click(screen.getByRole('button', { name: dict.preferencesLabel }));
    resolveConsent();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('persists acceptance and allows withdrawal through preferences', () => {
    render(control);
    resolveConsent();
    fireEvent.click(screen.getByRole('button', { name: dict.accept }));
    expect(setAnalyticsConsent).toHaveBeenLastCalledWith('granted');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: dict.preferencesLabel }));
    fireEvent.click(screen.getByRole('button', { name: dict.decline }));
    expect(setAnalyticsConsent).toHaveBeenLastCalledWith('denied');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancels the pending check on unmount', () => {
    render(control).unmount();
    resolveConsent();
    expect(initializeAnalyticsFromConsent).not.toHaveBeenCalled();
  });

  it('hydrates the hidden server dialog without mismatches', async () => {
    jest.mocked(initializeAnalyticsFromConsent).mockReturnValue('granted');
    const container = document.createElement('div');
    container.innerHTML = renderToString(control);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    document.body.appendChild(container);
    const onRecoverableError = jest.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, control, { onRecoverableError });
    });
    resolveConsent();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(onRecoverableError).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });
});
