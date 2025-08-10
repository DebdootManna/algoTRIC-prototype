// Browser benchmark: measures AES-only vs Hybrid (AES+RSA) roundtrip times.
// IMPORTANT: Running long benchmarks can block the UI — we await small batches and yield to event loop.

import * as RSA from './rsa.js';
import * as AES from './aes.js';

// helper: random bytes
function randomBytes(len) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

async function aesRoundTrip(payload) {
  // AES-only: generate ephemeral AES key, encrypt, decrypt
  const key = await AES.generateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, payload);
  await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct);
}

async function hybridRoundTrip(pubKeyCrypto, privKeyCrypto, payload) {
  // Hybrid: AES encrypt, wrap AES raw key with RSA (encrypt raw bytes), then RSA decrypt + AES decrypt
  const aesKey = await AES.generateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, aesKey, payload);
  const rawAes = await AES.exportRawAesKey(aesKey);
  // wrap: encrypt rawAes with RSA public
  const wrapped = await crypto.subtle.encrypt({name:'RSA-OAEP'}, pubKeyCrypto, rawAes);
  // unwrap
  const rawUn = await crypto.subtle.decrypt({name:'RSA-OAEP'}, privKeyCrypto, wrapped);
  const key2 = await AES.importRawAesKey(rawUn);
  await crypto.subtle.decrypt({name:'AES-GCM', iv}, key2, ct);
}

export async function runBrowserBenchmark({sizes=[1024,10240,102400], iters=3, onUpdate=null}) {
  // generate RSA keypair once for hybrid
  const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([0x01,0x00,0x01]), hash: 'SHA-256' }, true, ['encrypt','decrypt']);
  const pub = kp.publicKey;
  const priv = kp.privateKey;

  const results = { sizes: [], aesMeans: [], hybridMeans: [], cpuMeans: [], rssMeans: [] };

  for (const s of sizes) {
    // produce random payloads for this size
    const timingsAes = [];
    const timingsHybrid = [];
    const cpuSamples = [];
    const rssSamples = [];

    for (let i=0;i<iters;i++) {
      // yield to event loop
      await new Promise(r => setTimeout(r, 10));
      const payload = randomBytes(s);
      // AES-only
      const t0 = performance.now();
      await aesRoundTrip(payload);
      const t1 = performance.now();
      timingsAes.push(t1 - t0);

      // hybrid
      const th0 = performance.now();
      await hybridRoundTrip(pub, priv, payload);
      const th1 = performance.now();
      timingsHybrid.push(th1 - th0);

      // approximations: CPU percent we cannot measure precisely in browser; use time per byte as proxy
      cpuSamples.push((timingsAes[timingsAes.length-1] + timingsHybrid[timingsHybrid.length-1]) / 2);
      if ('memory' in performance) {
        // Chrome provides performance.memory (experimental)
        try { rssSamples.push(performance.memory.usedJSHeapSize || 0); } catch(e) { rssSamples.push(0); }
      } else {
        rssSamples.push(0);
      }

      // partial update callback
      if (onUpdate) {
        onUpdate({
          sizes: [...results.sizes, s],
          aesMeans: [...results.aesMeans, average(timingsAes)],
          hybridMeans: [...results.hybridMeans, average(timingsHybrid)],
          cpuMeans: [...results.cpuMeans, average(cpuSamples)],
          rssMeans: [...results.rssMeans, average(rssSamples)]
        });
      }
    }

    results.sizes.push(s);
    results.aesMeans.push(average(timingsAes));
    results.hybridMeans.push(average(timingsHybrid));
    results.cpuMeans.push(average(cpuSamples));
    results.rssMeans.push(average(rssSamples));
  }
  return results;
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}
