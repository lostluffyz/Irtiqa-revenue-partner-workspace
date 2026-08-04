"use client";

/**
 * LoadingMessages — Dynamic status text during loading.
 *
 * Displays the current loading status message with smooth transitions.
 * Uses aria-live to announce state changes to screen readers.
 *
 * Props:
 * - message: The current status text to display
 */
export function LoadingMessages({ message }: { message: string }) {
  return (
    <div className="h-[20px] flex items-center justify-center" aria-live="polite" aria-atomic="true">
      <p className="text-[13px] text-[var(--text-2)] tracking-[0.01em] loading-message-fade">
        {message}
      </p>
    </div>
  );
}
