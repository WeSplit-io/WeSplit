/**
 * Phone Number Validation Utilities
 * Validates and formats phone numbers in E.164 format
 * E.164 format: +[country code][number] (e.g., +1234567890)
 */

/**
 * Validate phone number in E.164 format
 * E.164 format: ^\+[1-9]\d{1,14}$
 * - Must start with +
 * - Country code: 1-9 followed by 1-14 digits
 * - Total length: 1-15 digits after +
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // E.164 format: +[country code][number]
  // Country code starts with 1-9, followed by 1-14 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  
  // Remove all whitespace for validation
  const cleaned = phone.replace(/\s/g, '');
  
  return e164Regex.test(cleaned);
}

/**
 * Normalize phone number to E.164 format
 * - Removes spaces, dashes, parentheses
 * - Adds + prefix if missing
 * - Ensures proper format
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if present (we'll add it back)
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }
  
  // Remove leading zeros
  normalized = normalized.replace(/^0+/, '');
  
  // Add + prefix
  if (normalized.length > 0) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

/**
 * Format phone number for display
 * Formats to E.164 but can be customized for display
 * Example: +1234567890 -> +1 (234) 567-890
 */
export function formatPhoneNumber(phone: string, displayFormat: boolean = false): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // First normalize to E.164
  const normalized = normalizePhoneNumber(phone);
  
  if (!displayFormat) {
    return normalized;
  }

  // Format for display: +1 (234) 567-890
  if (normalized.length >= 11) {
    // US/Canada format
    const countryCode = normalized.substring(0, 2); // +1
    const areaCode = normalized.substring(2, 5);
    const firstPart = normalized.substring(5, 8);
    const secondPart = normalized.substring(8);
    
    return `${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
  } else if (normalized.length >= 8) {
    // International format (simplified)
    const countryCode = normalized.substring(0, 3);
    const rest = normalized.substring(3);
    
    // Split rest into groups of 3-4 digits
    const formatted = rest.match(/.{1,4}/g)?.join(' ') || rest;
    return `${countryCode} ${formatted}`;
  }
  
  return normalized;
}

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length < 3) {
    return null;
  }

  // Country codes are 1-3 digits after +
  // Try 1 digit first (most common: +1, +7, etc.)
  if (normalized.length >= 2) {
    const oneDigit = normalized.substring(0, 2);
    if (/^\+[1-9]$/.test(oneDigit)) {
      return oneDigit;
    }
  }
  
  // Try 2 digits
  if (normalized.length >= 3) {
    const twoDigits = normalized.substring(0, 3);
    if (/^\+[1-9]\d$/.test(twoDigits)) {
      return twoDigits;
    }
  }
  
  // Try 3 digits
  if (normalized.length >= 4) {
    const threeDigits = normalized.substring(0, 4);
    if (/^\+[1-9]\d{2}$/.test(threeDigits)) {
      return threeDigits;
    }
  }
  
  return null;
}

/**
 * Validate and format phone number in one step
 * Returns formatted phone or null if invalid
 */
export function validateAndFormatPhone(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  
  if (isValidPhoneNumber(normalized)) {
    return normalized;
  }
  
  return null;
}

