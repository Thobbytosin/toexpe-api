export function validatePasswordStrength(password: string): string | null {
  const trimmed = password.trim();

  if (trimmed.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (!/[A-Z]/.test(trimmed)) {
    return "Password must include at least one uppercase letter";
  }

  if (!/[a-z]/.test(trimmed)) {
    return "Password must include at least one lowercase letter";
  }

  if (!/[0-9]/.test(trimmed)) {
    return "Password must include at least one number";
  }

  return null;
}
