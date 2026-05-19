/**
 * Thin wrapper around posthog-js.
 * All calls are safe no-ops when PostHog isn't initialised (dev without a key).
 */
import posthog from 'posthog-js';

type Props = Record<string, string | number | boolean | null>;

function track(event: string, props?: Props) {
  try {
    posthog.capture(event, props);
  } catch {
    // posthog not initialised — ignore
  }
}

// ─── Problem page ────────────────────────────────────────────────────────────

export const analytics = {
  problemViewed(slug: string, difficulty: string, category: string) {
    track('problem_viewed', { slug, difficulty, category });
  },

  sessionStarted(slug: string) {
    track('session_started', { slug });
  },

  sessionError(slug: string, error: string) {
    track('session_error', { slug, error });
  },

  /** Call on tab close / component unmount with total time the terminal was live */
  sessionDuration(slug: string, durationSeconds: number) {
    track('session_duration', { slug, duration_s: durationSeconds });
  },

  // ─── Hints ───────────────────────────────────────────────────────────────

  hintRevealed(slug: string, hintIndex: number) {
    track('hint_revealed', { slug, hint_index: hintIndex });
  },

  // ─── Solution checking ───────────────────────────────────────────────────

  verifyAttempted(slug: string) {
    track('verify_attempted', { slug });
  },

  verifyPassed(slug: string, elapsedSeconds: number) {
    track('verify_passed', { slug, elapsed_s: elapsedSeconds });
  },

  verifyFailed(slug: string, message: string) {
    track('verify_failed', { slug, message: message.slice(0, 200) });
  },
};
