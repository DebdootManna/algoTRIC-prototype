# algoTRIC — blog/interactive demo

This folder is a deployable single-page site for the algoTRIC research. It includes two interactive demos:
- AES + RSA hybrid (Web Crypto)
- Matrix-transform cipher (demo implementation of the paper flow)

## How to add to your repo

1. Copy the `blog/` folder into the root of your repository.
2. Commit and push.
3. For GitHub Pages:
   - Set Pages source to `main` branch and folder `/blog` (or root if you move files).
   - Or move files to repository root to serve directly.
4. For Vercel/Netlify:
   - Link the repo and set the build output to the folder (no build needed).

## Files
- `index.html` — main page
- `style.css` — minor styles
- `js/` — modules and script
- `assets/` — images, logos you provide

## Notes & Security
- The matrix demo implements a small, reversible transform for educational purposes. **It is not production-grade cryptography.**
- The AES+RSA demo uses Web Crypto and demonstrates hybrid encryption. For production use, prefer standardized formats (CMS, PKCS, or libs such as libsodium) and careful packaging, authenticated metadata, and safe key storage.
- The prime `P` and matrices in the demo are deliberately small to keep the demo fast and explainable. Real crypto uses large parameter sizes and well-reviewed constructions.

## Extensions
- Add ECC-based hybrid (ECDH + AES-GCM).
- Implement a server-side demo for long messages and persistent key storage (with careful security).
- Replace the simple transforms with a concrete implementation of Gupta / Abaoub-Shkheam transforms if the math is available in JS (or precompute transform tables server-side).
