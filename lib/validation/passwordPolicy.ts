/** Short hint for forms (English UI). */
export const PASSWORD_POLICY_HINT =
  'At least 8 characters, 1 uppercase letter, 1 number, and 1 symbol (e.g. !@#$).';

/**
 * Returns a user-facing error message, or `null` if the password meets policy.
 * Blocks trivial passwords like all digits (e.g. 123123123) via uppercase + symbol rules.
 */
export function getPasswordPolicyError(password: string): string | null {
  if (!password) {
    return 'Please enter a password.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }
  // Any non-alphanumeric counts as a symbol (punctuation, space, unicode symbols, etc.)
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one symbol (e.g. ! @ # $ %).';
  }
  return null;
}
