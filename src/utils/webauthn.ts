/**
 * WebAuthn utilities for enrolling and verifying native platform biometrics
 * (Touch ID, Face ID, Android Fingerprint, Windows Hello).
 *
 * SECURITY DESIGN:
 * - Credentials are bound to: email + studentId + this physical device's secure enclave.
 * - The stored token format is: "webauthn:<credentialId>:<email>"
 * - Verification re-checks the email matches the stored token to prevent cross-account abuse.
 * - No browser-signature fallback — hardware biometrics are mandatory.
 */

export const bufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Checks if native hardware biometrics (platform authenticators)
 * are supported by this browser and device.
 */
export const isWebAuthnSupported = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

/**
 * Enrolls a native biometric credential bound to this student's email + ID.
 * The user.id encodes both email and studentId to make the credential unique per user per device.
 */
export const registerBiometrics = async (
  studentId: string,
  studentName: string,
  email: string
): Promise<{ credentialId: string; token: string }> => {
  const supported = await isWebAuthnSupported();
  if (!supported) {
    throw new Error(
      'Your device does not support hardware biometrics (Touch ID / Face ID / Windows Hello). ' +
      'Please use a device with biometric hardware to register.'
    );
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  // Embed both email and studentId into the user.id so this credential is
  // cryptographically bound to this specific account on this specific device.
  const userIdentity = `${email}::${studentId}`;
  const userId = new TextEncoder().encode(userIdentity);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'SMAS Attendance System',
        id: window.location.hostname
      },
      user: {
        id: userId,
        name: email,           // shown in the native prompt
        displayName: studentName
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },    // ES256 (mobile secure enclaves)
        { type: 'public-key', alg: -257 }   // RS256 (Windows Hello / laptops)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // native device biometric sensors only
        userVerification: 'required',        // fingerprint or face required
        requireResidentKey: false
      },
      timeout: 60000
    }
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Biometric registration was cancelled or failed.');
  }

  const credentialId = bufferToBase64(credential.rawId);

  // Token format: "webauthn:<credentialId>:<email>"
  // This lets us verify both the hardware credential AND the account email at scan time.
  const token = `webauthn:${credentialId}:${email}`;

  return { credentialId, token };
};

/**
 * Verifies the native biometrics for a registered credential token.
 * Also re-validates that the token belongs to the expected email to block cross-account abuse.
 */
export const verifyBiometrics = async (
  storedToken: string,
  expectedEmail: string
): Promise<boolean> => {
  // Token format: "webauthn:<credentialId>:<email>"
  const parts = storedToken.split(':');
  if (parts.length < 3 || parts[0] !== 'webauthn') {
    console.error('Invalid stored biometric token format.');
    return false;
  }

  const credentialId = parts[1];
  const tokenEmail = parts.slice(2).join(':'); // handles emails with colons (edge case)

  // Verify the email in the token matches the currently logged in user
  if (tokenEmail !== expectedEmail) {
    console.warn('Biometric token email mismatch — cross-account attack blocked.');
    return false;
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credentialBuffer = base64ToBuffer(credentialId);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: credentialBuffer
          }
        ],
        userVerification: 'required', // enforce hardware fingerprint scan
        timeout: 60000
      }
    });

    return !!assertion;
  } catch (err) {
    console.error('Biometric verification rejected or failed:', err);
    return false;
  }
};
