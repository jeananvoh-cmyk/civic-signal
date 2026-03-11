import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "civic_pending_reports";

export interface PendingReport {
  id: string; // local uuid
  payload: Record<string, unknown>;
  createdAt: string;
}

function getPending(): PendingReport[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setPending(reports: PendingReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function usePendingReports() {
  const [pendingCount, setPendingCount] = useState(() => getPending().length);

  const refresh = useCallback(() => {
    setPendingCount(getPending().length);
  }, []);

  const enqueue = useCallback((payload: Record<string, unknown>) => {
    const entry: PendingReport = {
      id: crypto.randomUUID(),
      payload,
      createdAt: new Date().toISOString(),
    };
    const current = getPending();
    setPending([...current, entry]);
    refresh();
    return entry.id;
  }, [refresh]);

  const flush = useCallback(async () => {
    const pending = getPending();
    if (pending.length === 0) return;

    const succeeded: string[] = [];
    for (const entry of pending) {
      try {
        const { error } = await supabase.from("reports").insert(entry.payload as any);
        if (!error) succeeded.push(entry.id);
      } catch {
        // keep in queue on failure
      }
    }

    if (succeeded.length > 0) {
      const remaining = getPending().filter((r) => !succeeded.includes(r.id));
      setPending(remaining);
      refresh();
    }

    return succeeded.length;
  }, [refresh]);

  // Auto-flush when connectivity returns
  useEffect(() => {
    const handleOnline = () => {
      if (getPending().length > 0) flush();
    };
    window.addEventListener("online", handleOnline);
    // Try to flush on mount too (in case we came back online)
    if (navigator.onLine) flush();
    return () => window.removeEventListener("online", handleOnline);
  }, [flush]);

  return { pendingCount, enqueue, flush, refresh };
}
