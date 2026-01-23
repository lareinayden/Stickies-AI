/**
 * Generate unique ingestion IDs for audio uploads
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique ingestion ID
 * Format: timestamp-uuid for better traceability
 */
export function generateIngestionId(): string {
  const timestamp = Date.now();
  const uuid = randomUUID();
  return `${timestamp}-${uuid}`;
}

/**
 * Validate ingestion ID format
 */
export function isValidIngestionId(id: string): boolean {
  // Format: timestamp-uuid
  // Example: 1706123456789-550e8400-e29b-41d4-a716-446655440000
  const pattern = /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}
