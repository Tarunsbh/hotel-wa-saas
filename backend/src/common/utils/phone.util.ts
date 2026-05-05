/**
 * Phone number normalization utilities.
 *
 * WhatsApp Cloud API sends `from` WITHOUT a leading `+` (e.g. "919555009712").
 * Our DB stores guests with E.164 format WITH `+` (e.g. "+919555009712").
 *
 * Use these helpers everywhere phone numbers are compared or stored so we
 * never create duplicate guests for the same number.
 */

/**
 * toE164 — ensure a phone number has a leading `+`.
 * Strips spaces, dashes, parentheses before adding the prefix.
 *
 * Examples:
 *   "919555009712"    → "+919555009712"
 *   "+919555009712"   → "+919555009712"
 *   " +1 (800) 555 1234 " → "+18005551234"
 */
export function toE164(phone: string): string {
  const stripped = (phone || '').replace(/[\s\-().]/g, '').trim();
  if (!stripped) return stripped;
  return stripped.startsWith('+') ? stripped : `+${stripped}`;
}

/**
 * stripPlus — remove the leading `+` from a phone number.
 * Used when Meta API returns numbers without `+` and we need to compare.
 *
 * Examples:
 *   "+919555009712"  → "919555009712"
 *   "919555009712"   → "919555009712"
 */
export function stripPlus(phone: string): string {
  return (phone || '').replace(/^\+/, '');
}

/**
 * phonesMatch — returns true if two phone numbers refer to the same subscriber,
 * regardless of whether either has a leading `+`.
 */
export function phonesMatch(a: string, b: string): boolean {
  return stripPlus(a) === stripPlus(b);
}

/**
 * isValidE164 — basic structural check (not a full telecom lookup).
 *
 * A valid E.164 number:
 *   - starts with `+`
 *   - followed by 1-3 digit country code + subscriber (total 7–15 digits)
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone || '');
}
