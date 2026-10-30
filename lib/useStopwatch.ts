import { useEffect, useRef, useState } from "react";

// Starts on mount. `read()` gives exact seconds for the log; `elapsed` re-renders
// ten times a second for the on-screen timer.
export function useStopwatch() {
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startedAt.current = performance.now();
    const id = window.setInterval(() => {
      setElapsed((performance.now() - startedAt.current) / 1000);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  return { elapsed, read: () => (performance.now() - startedAt.current) / 1000 };
}

export function formatSeconds(seconds: number) {
  return `${seconds.toFixed(1)}s`;
}
