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
 * Checks if the hostname is an IP address.
 * WebAuthn forbids IP addresses in the rp.id field.
 */
export const isIpAddress = (hostname: string): boolean => {
  const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return ipv4Pattern.test(hostname) || (hostname.includes(':') && !hostname.includes('localhost'));
};

/**
 * Resolves the Relying Party ID (RP ID).
 * If the current page is accessed via loopback IP, we map it to 'localhost'.
 */
export const getRelyingPartyId = (): string => {
  const hostname = window.location.hostname;
  if (hostname === '127.0.0.1' || hostname === '[::1]') {
    return 'localhost';
  }
  return hostname;
};

/**
 * Checks if native hardware biometrics (platform authenticators)
 * are supported by this browser and device.
 */
export const isWebAuthnSupported = async (): Promise<boolean> => {
  console.log("[WebAuthn] Checking support...");
  if (!window.PublicKeyCredential) {
    console.warn("[WebAuthn] window.PublicKeyCredential is not defined");
    return false;
  }
  
  const hostname = window.location.hostname;
  if (isIpAddress(hostname) && hostname !== '127.0.0.1' && hostname !== '[::1]') {
    console.warn("[WebAuthn] Accessing via IP address. WebAuthn requires a domain name or localhost.");
    return false;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    console.log("[WebAuthn] Platform authenticator available:", available);
    return available;
  } catch (err) {
    console.error("[WebAuthn] Error checking platform authenticator availability:", err);
    return false;
  }
};

/**
 * Enrolls a native biometric credential bound to this student's email + ID.
 */
export const registerBiometrics = async (
  studentId: string,
  studentName: string,
  email: string
): Promise<{ credentialId: string; token: string }> => {
  console.log("[WebAuthn] registerBiometrics started", { studentId, studentName, email });
  
  const supported = await isWebAuthnSupported();
  if (!supported) {
    const hostname = window.location.hostname;
    if (isIpAddress(hostname)) {
      throw new Error(
        'WebAuthn does not support raw IP addresses. ' +
        'Please access this web application using localhost (http://localhost:5173) or a domain name.'
      );
    }
    throw new Error(
      'Your device does not support hardware biometrics (Touch ID / Face ID / Windows Hello). ' +
      'Please use a device with biometric hardware to register.'
    );
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdentity = `${email}::${studentId}`;
  const userId = new TextEncoder().encode(userIdentity);
  const rpId = getRelyingPartyId();

  console.log(`[WebAuthn] Calling navigator.credentials.create with rp.id="${rpId}"...`);
  
  // Build PublicKeyCredentialCreationOptions
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'SMAS Attendance System',
      id: rpId
    },
    user: {
      id: userId,
      name: email,
      displayName: studentName
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },    // ES256
      { type: 'public-key', alg: -257 }   // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      requireResidentKey: false
    },
    timeout: 60000
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions
    }) as PublicKeyCredential;

    console.log("[WebAuthn] navigator.credentials.create returned credential:", credential);

    if (!credential) {
      console.error("[WebAuthn] Credential returned is null or undefined");
      throw new Error('Biometric registration was cancelled or failed.');
    }

    const credentialId = bufferToBase64(credential.rawId);
    const token = `webauthn:${credentialId}:${email}`;

    console.log("[WebAuthn] Registration successful, generated token:", token);
    return { credentialId, token };
  } catch (err: any) {
    console.error("[WebAuthn] Error during navigator.credentials.create:", err);
    throw err;
  }
};

/**
 * Verifies the native biometrics for a registered credential token.
 */
export const verifyBiometrics = async (
  storedToken: string,
  expectedEmail: string
): Promise<boolean> => {
  console.log("[WebAuthn] verifyBiometrics started", { storedToken, expectedEmail });
  
  const parts = storedToken.split(':');
  if (parts.length < 3 || parts[0] !== 'webauthn') {
    console.error('[WebAuthn] Invalid stored biometric token format:', storedToken);
    return false;
  }

  const credentialId = parts[1];
  const tokenEmail = parts.slice(2).join(':');

  if (tokenEmail !== expectedEmail) {
    console.warn('[WebAuthn] Biometric token email mismatch:', { tokenEmail, expectedEmail });
    return false;
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credentialBuffer = base64ToBuffer(credentialId);
  const rpId = getRelyingPartyId();

  console.log(`[WebAuthn] Calling navigator.credentials.get with rpId="${rpId}"...`);

  const publicKeyRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: rpId,
    allowCredentials: [
      {
        type: 'public-key',
        id: credentialBuffer
      }
    ],
    userVerification: 'required',
    timeout: 60000
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyRequestOptions
    });

    console.log("[WebAuthn] navigator.credentials.get returned assertion:", assertion);
    return !!assertion;
  } catch (err) {
    console.error('[WebAuthn] Biometric verification failed or was cancelled:', err);
    return false;
  }
};
