#!/usr/bin/env bash
set -euo pipefail
source .venv/bin/activate || true
python bench/benchmark.py --sizes 1024 10240 102400 1048576 --iters 30
python bench/plot_results.py bench/results.json bench/profile.json
