const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, number[]>();

export function allowPasswordResetRequest(email: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(email.toLowerCase()) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(email.toLowerCase(), recent);
    return false;
  }
  recent.push(now);
  attempts.set(email.toLowerCase(), recent);
  return true;
}
