'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // analytics disabled in dev unless key is set

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false, // we capture manually below to avoid missing first page
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: false,
    });

    // Manually capture the initial pageview (App Router misses it otherwise)
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
