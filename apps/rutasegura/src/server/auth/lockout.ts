export type LockoutPolicy = {
  threshold: number;
  baseSeconds: number;
  maxSeconds: number;
};

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

export function shouldLock(failedLoginCount: number, policy: LockoutPolicy): boolean {
  return failedLoginCount >= policy.threshold;
}

/**
 * Duración del bloqueo para el nivel actual: `baseSeconds * 2^nivel`, con tope
 * `maxSeconds`. Cada bloqueo nuevo sube un nivel; un login exitoso lo reinicia.
 */
export function lockDurationSeconds(lockoutLevel: number, policy: LockoutPolicy): number {
  return Math.min(policy.baseSeconds * 2 ** lockoutLevel, policy.maxSeconds);
}
