'use client';

// Simple in-memory rate limiter for client-side use
class RateLimiter {
  private limits: Map<string, { count: number; resetTime: number }> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  // Check if a domain is rate limited
  public isRateLimited(domain: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const limit = this.limits.get(domain);
    
    if (!limit) {
      // Initialize rate limit for this domain
      this.limits.set(domain, { count: 1, resetTime: now + windowMs });
      return false;
    }
    
    // Reset counter if time has passed
    if (now > limit.resetTime) {
      this.limits.set(domain, { count: 1, resetTime: now + windowMs });
      return false;
    }
    
    // Check if we're over the limit
    if (limit.count >= maxRequests) {
      return true;
    }
    
    // Increment counter
    limit.count += 1;
    this.limits.set(domain, limit);
    return false;
  }
  
  // Get remaining requests for a domain
  public getRemainingRequests(domain: string): number {
    const now = Date.now();
    const limit = this.limits.get(domain);
    
    if (!limit) {
      return 10; // Default max
    }
    
    // Reset counter if time has passed
    if (now > limit.resetTime) {
      return 10; // Default max
    }
    
    return Math.max(0, 10 - limit.count);
  }
  
  // Get time until reset for a domain (in ms)
  public getTimeUntilReset(domain: string): number {
    const now = Date.now();
    const limit = this.limits.get(domain);
    
    if (!limit) {
      return 0;
    }
    
    return Math.max(0, limit.resetTime - now);
  }
  
  // Add a request to the queue
  public queueRequest(key: string, promise: Promise<any>): void {
    this.requestQueue.set(key, promise);
  }
  
  // Check if a request is already in progress
  public isRequestInProgress(key: string): boolean {
    return this.requestQueue.has(key);
  }
  
  // Get a queued request
  public getQueuedRequest(key: string): Promise<any> | undefined {
    return this.requestQueue.get(key);
  }
  
  // Remove a request from the queue
  public removeQueuedRequest(key: string): void {
    this.requestQueue.delete(key);
  }
  
  // Cache data
  public cacheData(key: string, data: any, ttlMs: number = 300000): void {
    this.cache.set(key, { data, timestamp: Date.now() + ttlMs });
  }
  
  // Get cached data if not expired
  public getCachedData(key: string): any | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    
    const now = Date.now();
    if (now > cached.timestamp) {
      // Expired
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.data;
  }
  
  // Check if cache has data for key
  public hasCachedData(key: string): boolean {
    return this.getCachedData(key) !== undefined;
  }
  
  // Clear all caches
  public clearCache(): void {
    this.cache.clear();
  }
}

// Export a singleton instance
export const rateLimiter = new RateLimiter();