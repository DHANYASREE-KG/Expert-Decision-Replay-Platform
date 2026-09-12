// ====================================================================
// Expert Decision Replay Platform - Form Validation Utility
// ====================================================================

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class FormValidator {
  static validateEmail(email) {
    if (!email || !email.trim()) return 'Email address is required.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address (e.g. user@company.com).';
    return null;
  }

  static validatePassword(password, minLength = 6) {
    if (!password) return 'Password is required.';
    if (password.length < minLength) return `Password must be at least ${minLength} characters in length.`;
    return null;
  }

  static validatePasswordConfirm(password, confirmPassword) {
    if (!confirmPassword) return 'Please confirm your password.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  static validateFeasibilityScore(score) {
    const num = parseInt(score, 10);
    if (isNaN(num) || num < 1 || num > 5) {
      return 'Feasibility score must be an integer between 1 (Very Difficult) and 5 (Highly Feasible).';
    }
    return null;
  }

  static validateCost(cost) {
    const num = parseFloat(cost);
    if (isNaN(num) || num < 0) {
      return 'Estimated cost must be a non-negative number ($0.00 or higher).';
    }
    return null;
  }

  static validateRequired(value, fieldLabel = 'This field') {
    if (value === null || value === undefined || String(value).trim() === '') {
      return `${fieldLabel} is required.`;
    }
    return null;
  }

  static validateTextLength(value, min = 0, max = 1000, fieldLabel = 'Field') {
    const len = (value || '').trim().length;
    if (min > 0 && len < min) {
      return `${fieldLabel} must be at least ${min} characters.`;
    }
    if (len > max) {
      return `${fieldLabel} cannot exceed ${max} characters (currently ${len}).`;
    }
    return null;
  }

  /**
   * Validates a set of inputs against field rules.
   * rules: { fieldName: [(val, data) => errorString | null] }
   */
  static validate(data, rules) {
    const errors = {};
    for (const [field, validators] of Object.entries(rules)) {
      const val = data[field];
      for (const fn of validators) {
        const err = fn(val, data);
        if (err) {
          errors[field] = err;
          break;
        }
      }
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
