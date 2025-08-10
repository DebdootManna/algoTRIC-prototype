// RSA helpers: generate PEM, import/export, base64 helpers
const RSA_ALGO = { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([0x01,0x00,0x01]), hash: 'SHA-256' };

export async function generateKeypairCryptoKey() {
  return crypto.subtle.generateKey(RSA_ALGO, true, ['encrypt', 'decrypt']);
}

export async function generateKeypairPEM() {
  const kp = await generateKeypairCryptoKey();
  const pub = await exportPublicKeyToPem(kp.publicKey);
  const priv = await exportPrivateKeyToPem(kp.privateKey);
  return { publicPem: pub, privatePem: priv, crypto: kp };
}

export async function exportPublicKeyToPem(key) {
  const spki = await crypto.subtle.exportKey('spki', key);
  const b64 = arrayBufferToBase64(spki);
  return `-----BEGIN PUBLIC KEY-----\n${formatPem(b64)}\n-----END PUBLIC KEY-----`;
}

export async function exportPrivateKeyToPem(key) {
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', key);
  const b64 = arrayBufferToBase64(pkcs8);
  return `-----BEGIN PRIVATE KEY-----\n${formatPem(b64)}\n-----END PRIVATE KEY-----`;
}

export async function importPublicKeyFromPem(pem) {
  const b64 = pemToBase64(pem);
  const spki = base64ToArrayBuffer(b64);
  return crypto.subtle.importKey('spki', spki, RSA_ALGO, true, ['encrypt']);
}

export async function importPrivateKeyFromPem(pem) {
  const b64 = pemToBase64(pem);
  const pkcs8 = base64ToArrayBuffer(b64);
  return crypto.subtle.importKey('pkcs8', pkcs8, RSA_ALGO, true, ['decrypt']);
}

/* Utilities */
function formatPem(b64) {
  return b64.match(/.{1,64}/g).join('\n');
}
function pemToBase64(pem) {
  return pem.replace(/-----(BEGIN|END) (PUBLIC|PRIVATE) KEY-----/g, '').replace(/\s+/g, '');
}
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
export function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}
