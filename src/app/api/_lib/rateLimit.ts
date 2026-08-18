/**
 * Simple in-memory rate limiter for serverless environments.
 * 
 * Uses a sliding window approach with IP-based tracking.
 * NOTE: In a multi-instance deployment (e.g., multiple Vercel serverless functions),
 * this only limits per-instance. For true distributed rate limiting,
 * use a service like Upstash Redis or Vercel KV.
 * 
 * This is still valuable as a first line of defense against individual bad actors.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited.
 * 
 * @param identifier - Unique identifier (typically IP address)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns Object with `limited` boolean and headers to set
 */
export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number = 60_000
): { limited: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from Next.js request headers.
 * Checks x-forwarded-for (Vercel/proxy), x-real-ip, and falls back to 'unknown'.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first (client)
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * Rate limit configurations for different endpoints.
 */
export const RATE_LIMITS = {
  /** Public order creation: 10 orders per minute per IP */
  createOrder: { max: 10, windowMs: 60_000 },
  /** Public menu/products: 60 requests per minute per IP */
  publicRead: { max: 60, windowMs: 60_000 },
  /** File uploads: 5 per minute per IP */
  upload: { max: 5, windowMs: 60_000 },
  /** QR validation: 30 per minute per IP */
  qrValidation: { max: 30, windowMs: 60_000 },
  /** Payment operations: 5 per minute per IP */
  payment: { max: 5, windowMs: 60_000 },
} as const;
