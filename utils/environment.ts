/**
 * Environment utilities for determining production vs staging context
 * and filtering staging-specific content appropriately
 */

/**
 * Determines if the current environment should show staging content
 * This includes:
 * - Development environment (NODE_ENV=development)
 * - Staging deployment (VERCEL_ENV=preview or staging-specific URL)
 * - Local development (localhost)
 */
export function shouldShowStagingContent(): boolean {
  // Always show in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check if we're in a staging/preview environment
  if (process.env.VERCEL_ENV === 'preview') {
    return true;
  }

  // Check if we're on localhost (for local testing)
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('staging');
  }

  // Default to false for production
  return false;
}

/**
 * Checks if a provider endpoint should be hidden in production
 * Hides staging.routstr.com domains unless in development/staging environment
 */
export function shouldHideProvider(endpoint: string): boolean {
  // Don't hide anything in staging/development
  if (shouldShowStagingContent()) {
    return false;
  }

  // Hide staging domains in production
  const stagingDomains = [
    'staging.routstr.com',
    'staging-routstr.com',
    'test.routstr.com',
    'dev.routstr.com'
  ];

  try {
    const url = new URL(endpoint);
    return stagingDomains.some(domain => url.hostname.includes(domain));
  } catch {
    // If URL parsing fails, check string directly
    return stagingDomains.some(domain => endpoint.includes(domain));
  }
}

/**
 * Filters an array of endpoints to remove staging domains in production
 */
export function filterStagingEndpoints(endpoints: readonly string[]): string[] {
  return endpoints.filter(endpoint => !shouldHideProvider(endpoint));
}

/**
 * Checks if a provider should be completely hidden based on all its endpoints
 * Only hides if ALL endpoints are staging (to avoid breaking legitimate providers)
 */
export function shouldHideProviderCompletely(endpoints: readonly string[]): boolean {
  if (endpoints.length === 0) return false;
  if (shouldShowStagingContent()) return false;
  
  // Only hide if ALL endpoints are staging domains
  return endpoints.every(endpoint => shouldHideProvider(endpoint));
}
