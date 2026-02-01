/**
 * Configuration for feature extraction
 * This allows us to use different feature extraction methods based on the environment
 */

import * as fallback from "./feature-extraction-fallback"

// Export the fallback methods directly
export const { extractImageFeatures, normalizeVector } = fallback

