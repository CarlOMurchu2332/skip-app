/**
 * API validation helpers for production hardening
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^\+?[\d\s()-]{7,20}$/;

export function isValidUUID(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export function isValidDate(val: unknown): val is string {
  if (typeof val !== 'string' || !DATE_REGEX.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

export function isValidPhone(val: unknown): val is string {
  return typeof val === 'string' && PHONE_REGEX.test(val);
}

export function isValidSkipSize(val: unknown): val is string {
  return typeof val === 'string' && ['8', '12', '14', '16', '20', '35', '40'].includes(val);
}

export function isValidAction(val: unknown): val is string {
  return typeof val === 'string' && ['drop', 'pick', 'pick_drop'].includes(val);
}

export function isValidStatus(val: unknown): val is string {
  return typeof val === 'string' && ['created', 'sent', 'in_progress', 'completed', 'cancelled'].includes(val);
}

/** Collect multiple validation errors at once */
export class ValidationErrors {
  private errors: string[] = [];

  requireUUID(field: string, val: unknown) {
    if (!isValidUUID(val)) this.errors.push(`${field} must be a valid UUID`);
    return this;
  }

  requireDate(field: string, val: unknown) {
    if (!isValidDate(val)) this.errors.push(`${field} must be a valid date (YYYY-MM-DD)`);
    return this;
  }

  requireNonEmpty(field: string, val: unknown) {
    if (!isNonEmptyString(val)) this.errors.push(`${field} is required`);
    return this;
  }

  optionalUUID(field: string, val: unknown) {
    if (val !== undefined && val !== null && !isValidUUID(val))
      this.errors.push(`${field} must be a valid UUID if provided`);
    return this;
  }

  optionalSkipSize(field: string, val: unknown) {
    if (val !== undefined && val !== null && !isValidSkipSize(val))
      this.errors.push(`${field} must be a valid skip size`);
    return this;
  }

  optionalAction(field: string, val: unknown) {
    if (val !== undefined && val !== null && !isValidAction(val))
      this.errors.push(`${field} must be drop, pick, or pick_drop`);
    return this;
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  toResponse() {
    return { error: 'Validation failed', details: this.errors };
  }
}
