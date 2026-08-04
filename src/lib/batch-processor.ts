// ============================================
// Batch Processing Infrastructure
// ============================================
//
// Reusable batch processor with progress callbacks.
// No DB, no UI imports — pure infrastructure.
//
// The onProgress callback enables future streaming upgrades:
// replace the callback with a WebSocket/SSE sender without
// changing the processor interface.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchConfig<T> {
  /** Items to process. */
  items: T[];
  /** Items per batch. Recommended: 100 for Supabase .in() queries. */
  batchSize: number;
  /** Process a single batch. Returns success/failed counts. */
  processor: (batch: T[], batchIndex: number) => Promise<{ success: number; failed: number }>;
  /** Called after each batch completes with (completedCount, totalCount). */
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchResult {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  batchCount: number;
}

// ---------------------------------------------------------------------------
// Batch Processor
// ---------------------------------------------------------------------------

/**
 * Process items in batches of configurable size.
 *
 * Usage:
 *   const result = await processBatch({
 *     items: leadIds,
 *     batchSize: 100,
 *     processor: async (batch) => {
 *       const { error } = await adminClient.from("leads").update({...}).in("id", batch);
 *       return { success: error ? 0 : batch.length, failed: error ? batch.length : 0 };
 *     },
 *     onProgress: (done, total) => console.log(`${done}/${total}`),
 *   });
 */
export async function processBatch<T>(config: BatchConfig<T>): Promise<BatchResult> {
  const { items, batchSize, processor, onProgress } = config;

  let totalSuccess = 0;
  let totalFailed = 0;
  let batchCount = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);

    const result = await processor(batch, batchIndex);

    totalSuccess += result.success;
    totalFailed += result.failed;
    batchCount++;

    onProgress?.(Math.min(i + batchSize, items.length), items.length);
  }

  return {
    totalProcessed: items.length,
    totalSuccess,
    totalFailed,
    batchCount,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates shuffle — in-place, unbiased.
 * Re-exported here for convenience in assignment flows.
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
