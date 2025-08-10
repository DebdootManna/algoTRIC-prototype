// AES helpers and hybrid pipeline using Web Crypto
export async function generateAesKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function aesEncrypt(key, plainText) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
  return { iv, ct };
}

export async function aesDecrypt(key, iv, ct) {
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(dec);
}

export async function exportRawAesKey(key) {
  return crypto.subtle.exportKey('raw', key);
}
export async function importRawAesKey(raw) {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

// Hybrid helpers: wrap AES key with RSA publicKeyCryptoKey using RSA-OAEP (WebCrypto)
export async function hybridEncryptWithRSA(rsaPublicCryptoKey, plainText) {
  const aesKey = await generateAesKey();
  const { iv, ct } = await aesEncrypt(aesKey, plainText);
  const rawAes = await exportRawAesKey(aesKey); // ArrayBuffer
  // wrap using RSA-OAEP: WebCrypto doesn't have wrapKey with RSA-OAEP consistently; using encrypt raw bytes
  const wrappedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicCryptoKey, rawAes);
  // package: [4 bytes length][wrappedKey][12 bytes iv][ciphertext]
  const wrappedKeyLen = wrappedKey.byteLength;
  const header = new Uint8Array(4);
  new DataView(header.buffer).setUint32(0, wrappedKeyLen, false);
  const parts = [header, new Uint8Array(wrappedKey), new Uint8Array(iv), new Uint8Array(ct)];
  return concatArrayBuffers(...parts);
}

export async function hybridDecryptWithRSA(rsaPrivateCryptoKey, payloadBuffer) {
  const view = new DataView(payloadBuffer);
  const wrappedKeyLen = view.getUint32(0, false);
  let offset = 4;
  const wrappedKey = payloadBuffer.slice(offset, offset + wrappedKeyLen); offset += wrappedKeyLen;
  const iv = payloadBuffer.slice(offset, offset + 12); offset += 12;
  const ct = payloadBuffer.slice(offset);
  // unwrap raw AES key
  const rawAes = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, rsaPrivateCryptoKey, wrappedKey);
  const aesKey = await importRawAesKey(rawAes);
  const plain = await aesDecrypt(aesKey, new Uint8Array(iv), ct);
  return plain;
}

// helper
function concatArrayBuffers(...bufs) {
  const total = bufs.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  bufs.forEach(b => {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  });
  return out.buffer;
}
