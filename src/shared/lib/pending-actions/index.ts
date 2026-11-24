"use client";

import { useRef, useState } from "react";

export function usePendingActions() {
  const running = useRef(new Set<string>());
  const [pending, setPending] = useState<readonly string[]>([]);
  async function run(key: string, action: () => Promise<void>) {
    if (running.current.has(key)) return;
    running.current.add(key);
    setPending([...running.current]);
    try {
      await action();
    } finally {
      running.current.delete(key);
      setPending([...running.current]);
    }
  }
  return { run, isPending: (key: string) => pending.includes(key), pending: pending.length > 0 };
}
