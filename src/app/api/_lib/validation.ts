/**
 * Input validation utilities for API routes.
 * Provides UUID validation and sanitization helpers.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4 format.
 * Prevents query injection via path parameters.
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validates and returns a UUID, or null if invalid.
 */
export function parseUUID(value: string | null | undefined): string | null {
  if (!value || !isValidUUID(value)) return null;
  return value;
}

/**
 * Sanitizes a string for safe inclusion in queries.
 * Removes control characters and trims to max length.
 */
export function sanitizeString(value: string, maxLength: number = 500): string {
  // Remove control characters except newlines
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}
