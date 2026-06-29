// Utility to convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// Derive a cryptographic key from a password
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, password?: string): Promise<{ payload: string; isEncrypted: boolean }> {
  if (!password) {
    return { payload: data, isEncrypted: false };
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    stringToArrayBuffer(data)
  );

  // Combine salt, iv, and ciphertext into a single base64 string
  const combinedArray = new Uint8Array(salt.byteLength + iv.byteLength + encryptedBuffer.byteLength);
  combinedArray.set(salt, 0);
  combinedArray.set(iv, salt.byteLength);
  combinedArray.set(new Uint8Array(encryptedBuffer), salt.byteLength + iv.byteLength);

  const base64Payload = btoa(String.fromCharCode.apply(null, Array.from(combinedArray)));
  
  return { payload: base64Payload, isEncrypted: true };
}

export async function decryptData(encryptedPayload: string, password?: string): Promise<string> {
  if (!password) {
    throw new Error('Password required for decryption');
  }

  const binaryString = atob(encryptedPayload);
  const combinedArray = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combinedArray[i] = binaryString.charCodeAt(i);
  }

  const salt = combinedArray.slice(0, 16);
  const iv = combinedArray.slice(16, 28);
  const ciphertext = combinedArray.slice(28);

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    return arrayBufferToString(decryptedBuffer);
  } catch (error) {
    throw new Error('Decryption failed. Incorrect password or corrupted data.');
  }
}
