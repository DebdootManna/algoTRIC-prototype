"""Simple benchmark harness with psutil-based profiling.
Measures encrypt/decrypt roundtrip time for AES-only and AES+RSA hybrid,
and records CPU/memory stats during runs.
"""
import time
import argparse
import os
import json
import psutil
from src.crypto import aes_rsa_hybrid as hybrid

def sample_process_stats():
    p = psutil.Process()
    with p.oneshot():
        mem = p.memory_info().rss
        cpu = p.cpu_percent(interval=None)
        return {"rss": mem, "cpu_percent": cpu}

def bench_roundtrip(data: bytes, pub: bytes, priv: bytes, iters: int = 20):
    aes_times = []
    hybrid_times = []
    samples = []
    p = psutil.Process()
    # warm-up cpu_percent
    p.cpu_percent(interval=0.01)
    for _ in range(iters):
        # AES-only
        start = time.perf_counter()
        key, nonce, ciphertext, tag = hybrid.aes_encrypt(data)
        _ = hybrid.aes_decrypt(key, nonce, ciphertext, tag)
        aes_times.append(time.perf_counter() - start)

        # Hybrid
        start = time.perf_counter()
        payload = hybrid.hybrid_encrypt(pub, data)
        _ = hybrid.hybrid_decrypt(priv, payload)
        hybrid_times.append(time.perf_counter() - start)

        # sample stats after each iteration
        samples.append(sample_process_stats())

    return {
        "aes_mean": sum(aes_times) / len(aes_times),
        "hybrid_mean": sum(hybrid_times) / len(hybrid_times),
        "aes_all": aes_times,
        "hybrid_all": hybrid_times,
        "samples": samples,
    }

def main(sizes, iters):
    pub, priv = hybrid.generate_rsa_keypair(2048)
    results = {}
    profiles = {}
    for s in sizes:
        data = os.urandom(s)
        r = bench_roundtrip(data, pub, priv, iters=iters)
        results[str(s)] = {
            "aes_mean": r['aes_mean'],
            "hybrid_mean": r['hybrid_mean']
        }
        profiles[str(s)] = r['samples']
        print(f"size={s} bytes -> AES mean: {r['aes_mean']:.6f}s | Hybrid mean: {r['hybrid_mean']:.6f}s")
    # write JSON
    os.makedirs("bench", exist_ok=True)
    with open("bench/results.json", "w") as f:
        json.dump(results, f, indent=2)
    with open("bench/profile.json", "w") as f:
        json.dump(profiles, f, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sizes", nargs="*", type=int, default=[1024, 10240, 102400, 1048576])
    parser.add_argument("--iters", type=int, default=20)
    args = parser.parse_args()
    main(args.sizes, args.iters)
