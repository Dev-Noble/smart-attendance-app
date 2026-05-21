/**
 * WebAuthn utilities for enrolling and verifying native platform biometrics
 * (Touch ID, Face ID, Android Fingerprint, Windows Hello).
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
 * Enrolls a native biometric credential (Touch ID / Face ID / etc.) on the student's primary device.
 */
export const registerBiometrics = async (
  studentId: string,
  studentName: string
): Promise<{ credentialId: string; publicKey: string }> => {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(studentId);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "SMAS Attendance System",
        id: window.location.hostname
      },
      user: {
        id: userId,
        name: studentId,
        displayName: studentName
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256 (common for mobile secure enclaves)
        { type: "public-key", alg: -257 }  // RS256 (common for Windows Hello/laptops)
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // enforce native device biometric sensors
        userVerification: "required",        // require fingerprint or face unlock
        requireResidentKey: false
      },
      timeout: 60000
    }
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Biometric registration failed.");
  }

  const credentialId = bufferToBase64(credential.rawId);
  
  // Public key is returned as an ArrayBuffer
  const pubKeyBuffer = (credential.response as any).getPublicKey 
    ? (credential.response as any).getPublicKey() 
    : new ArrayBuffer(0);

  return {
    credentialId,
    publicKey: bufferToBase64(pubKeyBuffer)
  };
};

/**
 * Verifies the native biometrics of the user against their registered credential ID.
 */
export const verifyBiometrics = async (credentialIdBase64: string): Promise<boolean> => {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credentialId = base64ToBuffer(credentialIdBase64);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: "public-key",
            id: credentialId
          }
        ],
        userVerification: "required", // enforce fingerprint scan
        timeout: 60000
      }
    });

    return !!assertion;
  } catch (err) {
    console.error("Biometric verification rejected or failed:", err);
    return false;
  }
};
