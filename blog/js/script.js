import * as AES from './modules/aes.js';
import * as RSA from './modules/rsa.js';
import * as MATRIX from './modules/matrix.js';
import * as BENCH from './modules/benchmark.js';
import * as GR from './modules/graphs.js';

document.addEventListener('DOMContentLoaded', async () => {
  // ---------- AES+RSA demo wiring ----------
  const generateBtn = document.getElementById('generate-keys-btn');
  const encryptBtn = document.getElementById('hybrid-encrypt-btn');
  const decryptBtn = document.getElementById('hybrid-decrypt-btn');
  const publicPemArea = document.getElementById('rsa-public-pem');
  const payloadArea = document.getElementById('hybrid-payload');
  const plaintextOut = document.getElementById('hybrid-plaintext');

  let rsaPair = null;
  let lastHybridPayload = null;

  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    try {
      rsaPair = await RSA.generateKeypairPEM();
      publicPemArea.value = rsaPair.publicPem;
      generateBtn.textContent = 'Generated';
      encryptBtn.disabled = false;
    } catch (e) {
      alert('Key generation failed: ' + e);
      generateBtn.textContent = 'Generate RSA Keypair';
    }
    generateBtn.disabled = false;
  });

  encryptBtn.addEventListener('click', async () => {
    encryptBtn.disabled = true;
    const msg = document.getElementById('hybrid-msg').value || '';
    try {
      const pubKey = await RSA.importPublicKeyFromPem(rsaPair.publicPem);
      const payload = await AES.hybridEncryptWithRSA(pubKey, msg);
      const b64 = await RSA.arrayBufferToBase64(payload);
      payloadArea.value = b64;
      lastHybridPayload = payload;
      decryptBtn.disabled = false;
    } catch (e) {
      alert('Encrypt failed: ' + e);
    }
    encryptBtn.disabled = false;
  });

  decryptBtn.addEventListener('click', async () => {
    decryptBtn.disabled = true;
    try {
      const privKey = await RSA.importPrivateKeyFromPem(rsaPair.privatePem);
      const payloadBuf = RSA.base64ToArrayBuffer(payloadArea.value);
      const plain = await AES.hybridDecryptWithRSA(privKey, payloadBuf);
      plaintextOut.textContent = plain;
    } catch (e) {
      alert('Decrypt failed: ' + e);
    }
    decryptBtn.disabled = false;
  });

  // ---------- Matrix demo wiring ----------
  const matrixEncryptBtn = document.getElementById('matrix-encrypt-btn');
  const matrixDecryptBtn = document.getElementById('matrix-decrypt-btn');
  const matrixDisplay = document.getElementById('matrix-display');
  const matrixCipherOut = document.getElementById('matrix-ciphertext');
  let lastMatrixPackage = null;

  matrixEncryptBtn.addEventListener('click', () => {
    const msg = document.getElementById('matrix-msg').value.toUpperCase().trim();
    const out = MATRIX.encryptMessage(msg);
    matrixDisplay.innerHTML = MATRIX.matrixToHtml(out.matrix);
    matrixCipherOut.textContent = out.ciphertext;
    lastMatrixPackage = out.package;
    matrixDecryptBtn.disabled = false;
  });

  matrixDecryptBtn.addEventListener('click', () => {
    if (!lastMatrixPackage) return;
    const recovered = MATRIX.decryptPackage(lastMatrixPackage);
    matrixDisplay.innerHTML = MATRIX.matrixToHtml(recovered.matrix);
    matrixCipherOut.textContent = recovered.plaintext;
  });

  // ---------- Graphs and benchmark wiring ----------
  GR.initCharts(); // set up empty charts

  const runBtn = document.getElementById('run-bench-btn');
  const stopBtn = document.getElementById('stop-bench-btn');

  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    stopBtn.disabled = false;
    const sizes = document.getElementById('bench-sizes').value.split(',').map(s => parseInt(s.trim())).filter(Boolean);
    const iters = Math.max(1, parseInt(document.getElementById('bench-iters').value) || 3);
    try {
      const results = await BENCH.runBrowserBenchmark({sizes, iters, onUpdate: (partial) => {
        // partial update: redraw graphs from partial results
        GR.updateCharts(partial);
      }, stopSignal: () => stopBtn.disabled === false ? false : true});
      // final render
      GR.updateCharts(results);
    } catch (e) {
      console.error(e);
      alert('Benchmark failed: ' + e);
    } finally {
      runBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  stopBtn.addEventListener('click', () => {
    // user requested stop -> benchmark module monitors stopButton state by DOM or we can implement a global flag
    stopBtn.disabled = true;
    runBtn.disabled = false;
    // BENCH has internal checks to stop on request — for simplicity we rely on disabling stop to signal stop.
    alert('Stop requested; benchmark will stop after current iteration.');
  });

});
