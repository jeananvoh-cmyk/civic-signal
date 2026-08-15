/**
 * Offline submission queue for reports.
 * Submissions attempted while offline are saved to localStorage
 * and automatically retried when the network comes back.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const QUEUE_KEY = "signa_ci_offline_queue";

export interface QueuedReport {
  id: string; // local temp id
  queued_at: string;
  payload: Record<string, unknown>;
  photo_base64?: string; // optional: store photo as base64 for offline
}

function readQueue(): QueuedReport[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedReport[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function useOfflineQueue() {
  const { isOnline } = useNetworkStatus();
  const [queue, setQueue] = useState<QueuedReport[]>(readQueue);
  const [flushing, setFlushing] = useState(false);

  // Sync state from localStorage whenever it changes
  const refreshQueue = useCallback(() => {
    setQueue(readQueue());
  }, []);

  /** Enqueue a report payload when offline */
  const enqueue = useCallback((payload: Record<string, unknown>) => {
    const entry: QueuedReport = {
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      queued_at: new Date().toISOString(),
      payload,
    };
    const q = [...readQueue(), entry];
    writeQueue(q);
    setQueue(q);
    return entry.id;
  }, []);

  /** Flush the queue when back online */
  const flush = useCallback(async () => {
    const q = readQueue();
    if (!q.length || flushing) return;
    setFlushing(true);

    const failed: QueuedReport[] = [];
    for (const item of q) {
      try {
        const { error } = await supabase.from("reports").insert(item.payload as any);
        if (error) throw error;
      } catch {
        failed.push(item);
      }
    }

    writeQueue(failed);
    setQueue(failed);
    setFlushing(false);
    return q.length - failed.length; // number of successfully submitted items
  }, [flushing]);

  // Auto-flush when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      flush();
    }
  }, [isOnline]);

  return { queue, enqueue, flush, flushing, refreshQueue };
}
