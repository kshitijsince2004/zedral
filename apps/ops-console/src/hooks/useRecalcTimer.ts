import { useState, useEffect } from "react";

// ─── Return type ──────────────────────────────────────────────────────────────

export interface RecalcTimerState {
  secondsRemaining: number;
  isExpired: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Countdown timer for the M5a recalc window.
 * Counts down from `initialSeconds` to 0, then stops.
 * Clears the interval on unmount.
 */
export function useRecalcTimer(initialSeconds = 300): RecalcTimerState {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    // Reset when initialSeconds changes
    setSecondsRemaining(initialSeconds);

    if (initialSeconds <= 0) return;

    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [initialSeconds]);

  return {
    secondsRemaining,
    isExpired: secondsRemaining === 0,
  };
}
