// =========================================================================
// SUIVI BUDGET CI - RATE LIMITING & ANTI-ABUSE DEFENSE SERVICE
// Protection contre le spamming automatisé, attaques par rejeu et saturation.
// =========================================================================

export class RateLimiter {
  private static records: Map<string, number[]> = new Map();

  /**
   * Check whether an action is allowed for a specific key (e.g., 'login', 'proof_upload', 'newsletter')
   * @param actionKey Identifier for the restricted action + optional client ID
   * @param maxRequests Maximum allowed occurrences in the given window
   * @param windowSeconds Duration of the rate limiting window in seconds (default 60s)
   */
  public static check(actionKey: string, maxRequests: number = 10, windowSeconds: number = 60): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    // Clean up timestamps older than the sliding window
    const timestamps = (this.records.get(actionKey) || []).filter(t => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    timestamps.push(now);
    this.records.set(actionKey, timestamps);

    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Reset the rate limit counter for a specific action
   */
  public static reset(actionKey: string): void {
    this.records.delete(actionKey);
  }
}
