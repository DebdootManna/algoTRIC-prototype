// Chart setup & update helpers
let chartMeans = null, chartRSS = null, chartCPU = null;

export function initCharts() {
  const ctxMeans = document.getElementById('plot-means').getContext('2d');
  chartMeans = new Chart(ctxMeans, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'AES-only (ms)', data: [], borderColor: 'rgba(13,148,136,0.9)', fill:false },
      { label: 'Hybrid AES+RSA (ms)', data: [], borderColor: 'rgba(59,130,246,0.9)', fill:false }
    ]},
    options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
  });

  const ctxRSS = document.getElementById('plot-rss').getContext('2d');
  chartRSS = new Chart(ctxRSS, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'RSS (bytes approx)', data: [], borderColor:'rgba(234,88,12,0.9)'}] },
    options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
  });

  const ctxCPU = document.getElementById('plot-cpu').getContext('2d');
  chartCPU = new Chart(ctxCPU, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'CPU proxy (ms)', data: [], borderColor:'rgba(120,74,255,0.9)'}] },
    options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
  });
}

export function updateCharts(results) {
  if (!chartMeans) initCharts();
  chartMeans.data.labels = results.sizes.map(s => s.toLocaleString());
  chartMeans.data.datasets[0].data = results.aesMeans.map(v => (v || 0).toFixed(3));
  chartMeans.data.datasets[1].data = results.hybridMeans.map(v => (v || 0).toFixed(3));
  chartMeans.update();

  chartRSS.data.labels = results.sizes.map(s => s.toLocaleString());
  chartRSS.data.datasets[0].data = results.rssMeans.map(v => Math.round(v || 0));
  chartRSS.update();

  chartCPU.data.labels = results.sizes.map(s => s.toLocaleString());
  chartCPU.data.datasets[0].data = results.cpuMeans.map(v => (v || 0).toFixed(3));
  chartCPU.update();
}
