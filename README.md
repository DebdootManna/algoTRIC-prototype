# algoTRIC prototype — AES + RSA hybrid example (with profiling)

Quickstart:

```bash
# create virtualenv
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# run basic demo (sanity check)
python -m src.crypto.aes_rsa_hybrid --demo

# run benchmark (will produce bench/results.json and bench/profile.json)
python -m bench/benchmark.py --sizes 1024 10240 102400 1048576 --iters 30

# plot results
python bench/plot_results.py bench/results.json bench/profile.json
```

Notes:
- The containerized Dockerfile is included for convenience.
- If `pycryptodome` isn't installed on your system, install it inside the venv via pip.
