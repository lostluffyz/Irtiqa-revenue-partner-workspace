// ============================================
// Lead Distribution — Pure Algorithm
// ============================================
//
// Pure functions for distributing leads among partners.
// No DB, no UI, no server action imports.
// Usable by APIs, background jobs, automated workflows.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PartnerLoad {
  partnerId: string;
  partnerName: string;
  currentLoad: number;
}

export interface DistributionEntry {
  partnerId: string;
  partnerName: string;
  currentLoad: number;
  incoming: number;
  finalTotal: number;
}

export interface DistributionResult {
  entries: DistributionEntry[];
  totalAssigned: number;
}

// ---------------------------------------------------------------------------
// Auto-Balance Distribution
// ---------------------------------------------------------------------------

/**
 * Round-robin auto-balance: distributes `requestedCount` leads among partners
 * sorted by currentLoad ascending (least-loaded first).
 *
 * Algorithm:
 *   1. Sort eligible partners by currentLoad ascending
 *   2. Distribute one lead at a time in round-robin order
 *   3. Stop when requestedCount leads are distributed
 *
 * Example:
 *   Partners A=25, B=52, C=110, requesting 90 leads
 *   → A+30, B+30, C+30 (each gets 30, totals become 55, 82, 140)
 */
export function computeAutoBalance(
  partners: PartnerLoad[],
  requestedCount: number,
): DistributionResult {
  if (partners.length === 0 || requestedCount <= 0) {
    return {
      entries: partners.map((p) => ({
        partnerId: p.partnerId,
        partnerName: p.partnerName,
        currentLoad: p.currentLoad,
        incoming: 0,
        finalTotal: p.currentLoad,
      })),
      totalAssigned: 0,
    };
  }

  // Sort by currentLoad ascending (least-loaded first)
  const sorted = [...partners].sort((a, b) => a.currentLoad - b.currentLoad);

  // Track incoming per partner
  const incomingMap = new Map<string, number>();
  sorted.forEach((p) => incomingMap.set(p.partnerId, 0));

  // Distribute one-by-one round-robin
  let distributed = 0;
  let idx = 0;
  while (distributed < requestedCount) {
    const partner = sorted[idx % sorted.length];
    const current = incomingMap.get(partner.partnerId)!;
    incomingMap.set(partner.partnerId, current + 1);
    distributed++;
    idx++;
  }

  // Build entries
  const entries: DistributionEntry[] = sorted.map((p) => {
    const incoming = incomingMap.get(p.partnerId)!;
    return {
      partnerId: p.partnerId,
      partnerName: p.partnerName,
      currentLoad: p.currentLoad,
      incoming,
      finalTotal: p.currentLoad + incoming,
    };
  });

  return {
    entries,
    totalAssigned: distributed,
  };
}
