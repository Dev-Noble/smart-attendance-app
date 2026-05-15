/**
 * Generates a stable device fingerprint from browser properties.
 * Used to enforce one-device-per-session attendance policy.
 */
export const getDeviceFingerprint = async (): Promise<string> => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency ?? 'unknown',
  ].join('|');

  // Use SubtleCrypto for a proper hash if available, otherwise fallback
  if (window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(components);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: simple numeric hash
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};
