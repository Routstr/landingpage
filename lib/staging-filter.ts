/**
 * Simple staging domain filtering utilities
 */

const STAGING_PATTERNS = [
  'staging.routstr.com',
  'staging-routstr.com',
  'test.routstr.com',
  'dev.routstr.com',
  'preview.routstr.com',
  'staging.',
  'test.',
  'dev.',
  'preview.',
] as const;

/**
 * Check if an endpoint is a staging endpoint
 */
function isStagingEndpoint(endpoint: string): boolean {
  return STAGING_PATTERNS.some(pattern => endpoint.includes(pattern));
}

/**
 * Filter out staging endpoints from an array
 */
export function filterStagingEndpoints(endpoints: readonly string[]): string[] {
  return endpoints.filter(endpoint => !isStagingEndpoint(endpoint));
}

/**
 * Check if a provider should be hidden (has any staging endpoints)
 */
export function shouldHideProvider(endpoints: readonly string[]): boolean {
  if (endpoints.length === 0) return false;
  // Hide provider if ANY endpoint is staging (more aggressive filtering)
  return endpoints.some(endpoint => isStagingEndpoint(endpoint));
}
