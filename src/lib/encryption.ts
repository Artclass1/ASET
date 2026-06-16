// Web Crypto API based client-side AES-GCM encryption and decryption helpers
// Designed for local non-session leaking corporate MNPI data handling

async function getEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayload(payload: any, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const rawPayload = enc.encode(JSON.stringify(payload));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey(passphrase, salt);
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    rawPayload
  );
  
  // Combine salt, iv and ciphertext for unified local download/upload format
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.byteLength);
  combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);
  
  // Base64 encode the binary payload
  let binary = '';
  const bytes = new Uint8Array(combined);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decryptPayload(encryptedStr: string, passphrase: string): Promise<any> {
  const binaryString = atob(encryptedStr);
  const len = binaryString.length;
  const combined = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }
  
  if (combined.byteLength < 16 + 12) {
    throw new Error('Malformed encryption file asset');
  }
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 16 + 12);
  const ciphertext = combined.slice(16 + 12);
  
  const key = await getEncryptionKey(passphrase, salt);
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );
  
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}
