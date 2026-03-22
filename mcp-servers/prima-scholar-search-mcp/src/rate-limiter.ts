/**
 * Token bucket rate limiter.
 *
 * Tracks timestamps of recent requests and waits if the bucket is full.
 */

export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      // Calculate how long to wait until the oldest request exits the window
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 1;
      await new Promise((resolve) => setTimeout(resolve, waitMs));

      // Clean up again after waiting
      const afterWait = Date.now();
      this.timestamps = this.timestamps.filter(
        (t) => afterWait - t < this.windowMs
      );
    }

    this.timestamps.push(Date.now());
  }
}
