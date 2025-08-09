// Entry point: wires UI to modules
import * as AES from './modules/aes.js';
import * as RSA from './modules/rsa.js';
import * as MATRIX from './modules/matrix.js';
import * as UI from './modules/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Chart
  UI.initTradeoffChart();

  // AES+RSA demo wiring
  const generateBtn = document.getElementById('generate-keys-btn');
  const encryptBtn = document.getElementById('hybrid-encrypt-btn');
  const decryptBtn = document.getElementById('hybrid-decrypt-btn');
  const publicPemArea = document.getElementById('rsa-public-pem');
  const payloadArea = document.getElementById('hybrid-payload');
  const plaintextOut = document.getElementById('hybrid-plaintext');

  let rsaKeyPair = null;
  let hybridPayload = null;

  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    rsaKeyPair = await RSA.generateKeypairPEM();
    publicPemArea.value = rsaKeyPair.publicPem;
    generateBtn.textContent = 'Generated';
    encryptBtn.disabled = false;
    generateBtn.disabled = false;
  });

  encryptBtn.addEventListener('click', async () => {
    encryptBtn.disabled = true;
    const msg = document.getElementById('hybrid-msg').value;
    // Use Web Crypto to encrypt: AES-GCM + RSA-OAEP wrap
    const publicKey = await RSA.importPublicKeyFromPem(rsaKeyPair.publicPem);
    hybridPayload = await AES.hybridEncryptWithRSA(publicKey, msg);
    payloadArea.value = await UI.arrayBufferToBase64(hybridPayload);
    decryptBtn.disabled = false;
    encryptBtn.disabled = false;
  });

  decryptBtn.addEventListener('click', async () => {
    decryptBtn.disabled = true;
    const privateKey = await RSA.importPrivateKeyFromPem(rsaKeyPair.privatePem);
    const decrypted = await AES.hybridDecryptWithRSA(privateKey, UI.base64ToArrayBuffer(payloadArea.value));
    plaintextOut.textContent = decrypted;
    decryptBtn.disabled = false;
  });

  // MATRIX demo wiring
  const matrixEncryptBtn = document.getElementById('matrix-encrypt-btn');
  const matrixDecryptBtn = document.getElementById('matrix-decrypt-btn');
  const matrixDisplay = document.getElementById('matrix-display');
  const matrixCipherOut = document.getElementById('matrix-ciphertext');

  let lastMatrixPackage = null;

  matrixEncryptBtn.addEventListener('click', () => {
    const msg = document.getElementById('matrix-msg').value.toUpperCase().trim();
    // convert to matrix, run pipeline
    const { matrix, package: pkg, ciphertext } = MATRIX.encryptMessage(msg);
    matrixDisplay.innerHTML = MATRIX.matrixToHtml(matrix);
    matrixCipherOut.textContent = ciphertext;
    lastMatrixPackage = pkg;
    matrixDecryptBtn.disabled = false;
  });

  matrixDecryptBtn.addEventListener('click', () => {
    if (!lastMatrixPackage) return;
    const recovered = MATRIX.decryptPackage(lastMatrixPackage);
    matrixDisplay.innerHTML = MATRIX.matrixToHtml(recovered.matrix);
    matrixCipherOut.textContent = recovered.plaintext;
  });
});
