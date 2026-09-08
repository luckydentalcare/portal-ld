/**
 * Normalizes phone numbers to a consistent clean format.
 * Handles Bangladesh local numbers (01XXXXXXXXX) and international prefix (+880 / 880),
 * as well as general international numbers.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove spaces, dashes, parentheses, dots, pluses
  let cleaned = phone.trim().replace(/[\s\-().]/g, '');

  // If starts with +880, convert to 0
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('880') && cleaned.length === 13) {
    cleaned = '0' + cleaned.substring(3);
  }

  return cleaned;
}

/**
 * Strict Bangladesh Mobile Phone Validation & Normalization for Automas SMS Gateway.
 * Accepts:
 *  - 017XXXXXXXX (11 digits)
 *  - 88017XXXXXXXX (13 digits)
 *  - +88017XXXXXXXX (14 characters)
 * Valid prefixes in BD: 013, 014, 015, 016, 017, 018, 019.
 *
 * Returns normalized 11-digit local format: "01XXXXXXXXX"
 * Returns error: "INVALID_PHONE" if invalid or malformed.
 */
export function normalizeBdPhoneNumber(phone: string): {
  isValid: boolean;
  normalized: string;
  error?: 'INVALID_PHONE';
} {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: '', error: 'INVALID_PHONE' };
  }

  // Remove whitespace, dashes, parentheses, dots
  let cleaned = phone.trim().replace(/[\s\-().]/g, '');

  // Strip international prefix +88 or 88
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('+88')) {
    cleaned = cleaned.substring(3);
  }

  // If missing leading 0 and has 10 digits starting with 1[3-9]
  if (cleaned.length === 10 && /^1[3-9]\d{8}$/.test(cleaned)) {
    cleaned = '0' + cleaned;
  }

  // Strict BD mobile regex: 11 digits, starts with 01 followed by 3-9
  const isBdMobile = /^01[3-9]\d{8}$/.test(cleaned);

  if (!isBdMobile) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'INVALID_PHONE'
    };
  }

  return {
    isValid: true,
    normalized: cleaned
  };
}

/**
 * Quick check if phone is a valid Bangladesh mobile number
 */
export function isValidBdMobile(phone: string): boolean {
  return normalizeBdPhoneNumber(phone).isValid;
}

/**
 * Returns phone variations for flexible MongoDB regex query matching
 */
export function getPhoneSearchVariations(phone: string): string[] {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return [];

  const variations = [normalized];

  if (normalized.startsWith('01') && normalized.length === 11) {
    variations.push('+88' + normalized);
    variations.push('88' + normalized);
  }

  return variations;
}
