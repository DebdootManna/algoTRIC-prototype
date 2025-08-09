"""Plotting helper: reads bench/results.json and bench/profile.json and plots.
Uses matplotlib (single plot per call) and does not set specific colors.
Usage:
    python bench/plot_results.py bench/results.json bench/profile.json
"""
import sys
import json
import matplotlib.pyplot as plt
import numpy as np

def plot_means(results_path):
    with open(results_path, 'r') as f:
        res = json.load(f)
    sizes = sorted([int(k) for k in res.keys()])
    aes_means = [res[str(s)]['aes_mean'] for s in sizes]
    hybrid_means = [res[str(s)]['hybrid_mean'] for s in sizes]

    plt.figure()
    plt.plot(sizes, aes_means, marker='o', label='AES-only')
    plt.plot(sizes, hybrid_means, marker='s', label='Hybrid AES+RSA')
    plt.xscale('log')
    plt.xlabel('Payload size (bytes)')
    plt.ylabel('Mean roundtrip time (s)')
    plt.title('AES vs Hybrid mean roundtrip time')
    plt.legend()
    plt.grid(True)
    out = 'bench/plot_means.png'
    plt.savefig(out)
    print('Saved plot to', out)

def plot_profile(profile_path):
    with open(profile_path, 'r') as f:
        prof = json.load(f)
    sizes = sorted([int(k) for k in prof.keys()])
    # compute mean rss and cpu per size
    mean_rss = []
    mean_cpu = []
    for s in sizes:
        samples = prof[str(s)]
        rss = [x['rss'] for x in samples]
        cpu = [x['cpu_percent'] for x in samples]
        mean_rss.append(sum(rss)/len(rss))
        mean_cpu.append(sum(cpu)/len(cpu))

    # RSS plot
    plt.figure()
    plt.plot(sizes, mean_rss, marker='o')
    plt.xscale('log')
    plt.xlabel('Payload size (bytes)')
    plt.ylabel('Mean RSS (bytes)')
    plt.title('Process RSS vs payload size')
    plt.grid(True)
    out1 = 'bench/plot_rss.png'
    plt.savefig(out1)
    print('Saved RSS plot to', out1)

    # CPU plot
    plt.figure()
    plt.plot(sizes, mean_cpu, marker='o')
    plt.xscale('log')
    plt.xlabel('Payload size (bytes)')
    plt.ylabel('Mean CPU percent')
    plt.title('Process CPU% vs payload size')
    plt.grid(True)
    out2 = 'bench/plot_cpu.png'
    plt.savefig(out2)
    print('Saved CPU plot to', out2)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python bench/plot_results.py bench/results.json bench/profile.json')
        sys.exit(1)
    plot_means(sys.argv[1])
    plot_profile(sys.argv[2])
