// UI helpers and chart init
import { arrayBufferToBase64, base64ToArrayBuffer } from './rsa.js';

export function initTradeoffChart() {
  const ctx = document.getElementById('tradeoffChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Speed', 'Security', 'CPU Cost', 'Key Mgmt'],
      datasets: [
        { label: 'Symmetric (SE)', data: [90, 60, 20, 30], backgroundColor: 'rgba(13,148,136,0.7)' },
        { label: 'Asymmetric (AE)', data: [20, 90, 80, 95], backgroundColor: 'rgba(59,130,246,0.7)' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
    }
  });
}

// small helpers used by main script
export function arrayBufferToBase64Quiet(buf) {
  return arrayBufferToBase64(buf);
}
export function base64ToArrayBufferQuiet(b64) {
  return base64ToArrayBuffer(b64);
}

export async function arrayBufferToBase64(buf) {
  // buf may be ArrayBuffer or TypedArray
  if (buf instanceof ArrayBuffer) return arrayBufferToBase64Quiet(buf);
  if (ArrayBuffer.isView(buf)) return arrayBufferToBase64Quiet(buf.buffer);
  throw new Error('Unsupported type');
}
export function base64ToArrayBuffer(str) {
  return base64ToArrayBufferQuiet(str);
}
