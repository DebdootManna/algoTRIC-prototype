/**
 * matrix.js
 * Implements a readable, reversible pipeline inspired by the matrix-transform paper.
 *
 * Steps implemented:
 * 1) Plaintext -> numeric vector using table (A=1..Z=26, space=27)
 * 2) Pack into an n x n matrix (n chosen small by length); for demo n=3
 * 3) Generate a random non-singular integer key matrix A (n x n) and modulo P prime
 * 4) Cons = (A * M) mod P
 * 5) LU decomposition of A (Crout variant), compute L^-1 mod P
 * 6) B = (L^-1 * Cons) mod P  <-- intermediary cipher
 * 7) Apply a reversible "transform sequence" (this is a simplified, invertible routine
 *    that acts as our demo equivalent of Gupta / Abaoub-Shkheam operations)
 *
 * The transform is intentionally simple and reversible:
 *  - treat each entry as coefficient of polynomial g(x) and evaluate at s
 *  - store small metadata to invert via polynomial interpolation
 *
 * NOTE: This is for demonstration / reproducibility. The real integral transforms from the
 * paper are more complex; this implementation keeps mathematical mapping reversible and
 * easy to audit in JS.
 */

const CHAR_MAP = (() => {
  const m = {};
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
  for (let i=0;i<letters.length;i++) m[letters[i]] = i+1;
  return m;
})();
const REV_MAP = (() => {
  const r = {};
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
  for (let i=0;i<letters.length;i++) r[i+1] = letters[i];
  return r;
})();

function textToNumbers(text, n) {
  // Pad to n*n length
  const len = n*n;
  const padded = text.padEnd(len, ' ');
  const arr = padded.slice(0, len).split('').map(ch => CHAR_MAP[ch] || 27);
  // chunk into matrix rows
  const matrix = [];
  for (let i=0;i<n;i++) matrix.push(arr.slice(i*n, i*n + n));
  return matrix;
}
function numbersToText(matrix) {
  const flat = matrix.flat();
  return flat.map(v => REV_MAP[v] || ' ').join('').trim();
}

function randomInt(max) { return Math.floor(Math.random()*max); }

// generate non-singular integer matrix mod p
function generateKeyMatrix(n, p) {
  // naive: keep generating until invertible mod p
  while (true) {
    const A = Array.from({length:n}, () => Array.from({length:n}, () => randomInt(p)));
    if (modMatrixDeterminant(A, p) % p !== 0) return A;
  }
}

// compute determinant (integer) using basic algorithm (n small in demo)
function modMatrixDeterminant(mat, p) {
  // using recursive Laplace — fine for n<=4 in demo
  const n = mat.length;
  if (n === 1) return ((mat[0][0] % p) + p) % p;
  let det = 0;
  for (let c = 0; c < n; c++) {
    const sub = mat.slice(1).map(r => r.filter((_,i)=>i!==c));
    det += ((c%2===0?1:-1) * mat[0][c] * modMatrixDeterminant(sub, p));
    det %= p;
  }
  return ((det % p) + p) % p;
}

// matrix multiply mod p
function matMul(A, B, p) {
  const n = A.length; const m = B[0].length;
  const r = Array.from({length:n}, () => Array.from({length:m}, ()=>0));
  for (let i=0;i<n;i++) for (let j=0;j<m;j++) {
    let s = 0;
    for (let k=0;k<A[i].length;k++) s += A[i][k]*B[k][j];
    r[i][j] = ((s % p) + p) % p;
  }
  return r;
}

// Crout LU decomposition: returns {L, U} with L unit lower (or variant) - we'll use variant where L has 1s on diag
function luDecomposeCrout(A, p) {
  const n = A.length;
  const L = Array.from({length:n}, (_,i)=>Array.from({length:n}, (_,j)=> (i===j?1:0)));
  const U = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let j=0;j<n;j++) {
    // compute U[0..j][j]
    for (let i=0;i<=j;i++) {
      let s = 0;
      for (let k=0;k<i;k++) s += L[i][k]*U[k][j];
      U[i][j] = ((A[i][j] - s) % p + p) % p;
    }
    // compute L[j+1..n][j]
    for (let i=j+1;i<n;i++) {
      let s = 0;
      for (let k=0;k<j;k++) s += L[i][k]*U[k][j];
      // divide by U[j][j] mod p => multiply by inverse
      const denom = U[j][j];
      if (denom === 0) throw new Error('LU failed (zero pivot) in demo');
      const invDen = modInverse(denom, p);
      L[i][j] = ((A[i][j] - s) * invDen) % p;
      L[i][j] = ((L[i][j] % p) + p) % p;
    }
  }
  return {L, U};
}

// modular inverse using extended gcd
function egcd(a,b){
  if (b===0) return {g:a,x:1,y:0};
  const r = egcd(b, a % b);
  return {g:r.g, x:r.y, y:r.x - Math.floor(a/b) * r.y};
}
function modInverse(a, m){
  const r = egcd(a, m);
  if (r.g !== 1) throw new Error('No modular inverse');
  return ((r.x % m) + m) % m;
}

// invert lower triangular L (with 1s on diag) mod p
function invertLowerTriangular(L, p) {
  const n = L.length;
  // Solve L * X = I for X column-by-column
  const X = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let col = 0; col < n; col++) {
    const b = Array.from({length:n}, (_,i)=> i===col?1:0);
    // forward substitution
    const y = Array(n).fill(0);
    for (let i=0;i<n;i++) {
      let s = 0;
      for (let k=0;k<i;k++) s += L[i][k]*y[k];
      y[i] = ((b[i] - s) % p + p) % p;
      // note L[i][i] assumed 1
    }
    for (let i=0;i<n;i++) X[i][col] = y[i];
  }
  return X;
}

// small reversible transform: we will treat each column vector of B as polynomial coefficients,
// evaluate polynomial at s (small integer) => produces numbers. We'll keep s in package to invert with interpolation.
// Inverse via simple Vandermonde system solve (n small). This mimics forward/back transforms.
function forwardTransform(B, p) {
  const n = B.length;
  const s = 3 + randomInt(5); // small evaluation point 3..7
  const vals = []; // each column yields value array length n (we evaluate at s^i? but for simplicity one value per column)
  // We'll evaluate polynomial with coefficients=B column, at x=s, s^2, ... s^n to produce vector
  for (let col=0; col<n; col++) {
    const coeffs = B.map(row => row[col]);
    const out = [];
    for (let pow=1; pow<=n; pow++) {
      let sum = 0;
      for (let k=0;k<n;k++) {
        sum += coeffs[k] * Math.pow(s, pow+k); // simple mixing
      }
      out.push(((sum % p) + p) % p);
    }
    vals.push(out);
  }
  return {s, vals};
}
function inverseTransform(vals, s, p) {
  // invert the mixing: we built values as sum coeffs[k]*s^{pow+k}, which is linear in coeffs.
  // For demo n small, reconstruct by solving linear system Vandermonde-like for each column.
  const n = vals.length; // number of columns
  const coeffsByCol = [];
  for (let col=0; col<n; col++) {
    const rhs = vals[col]; // length n
    // build matrix M where M[row][k] = s^{row + k + 1}
    const M = Array.from({length:n}, (_,r)=>Array.from({length:n}, (_,k)=> Math.pow(s, r + k + 1) % p));
    // solve M * coeffs = rhs mod p (naive Gaussian elimination mod p)
    const coeffs = solveLinearMod(M, rhs, p);
    coeffsByCol.push(coeffs);
  }
  // rebuild B matrix
  const B = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let col=0; col<n; col++) for (let row=0; row<n; row++) B[row][col] = ((coeffsByCol[col][row] % p) + p) % p;
  return B;
}

// naive linear system solver mod p using Gaussian elimination
function solveLinearMod(A, b, p) {
  const n = A.length;
  // augment
  const M = A.map((row,i) => row.map(x=>((x%p)+p)%p).concat([((b[i]%p)+p)%p]));
  // forward elimination
  for (let i=0;i<n;i++) {
    // find pivot
    let pivot = i;
    for (let r=i;r<n;r++) if (M[r][i] !== 0) { pivot = r; break; }
    if (M[pivot][i] === 0) throw new Error('Singular matrix in demo solver');
    if (pivot !== i) { const tmp = M[i]; M[i] = M[pivot]; M[pivot] = tmp; }
    const inv = modInverse(M[i][i], p);
    // normalize row i
    for (let c=i;c<=n;c++) M[i][c] = (M[i][c] * inv) % p;
    // eliminate below
    for (let r=i+1;r<n;r++) {
      const factor = M[r][i];
      for (let c=i;c<=n;c++) M[r][c] = ((M[r][c] - factor * M[i][c]) % p + p) % p;
    }
  }
  // back substitution
  const x = Array(n).fill(0);
  for (let i=n-1;i>=0;i--) {
    let s = M[i][n];
    for (let c=i+1;c<n;c++) s = ((s - M[i][c]*x[c])%p + p) % p;
    x[i] = s;
  }
  return x;
}

/* Public API */
export function matrixToHtml(M) {
  return '<table class="border-collapse"><tbody>' + M.map(row => '<tr>' + row.map(v => `<td class="px-2 py-1 border">${v}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
}

export function encryptMessage(plaintext) {
  // demo fixed n=3
  const n = 3;
  const P = 37; // small prime for demo (paper uses prime mod p)
  const M = textToNumbers(plaintext.toUpperCase(), n); // matrix n x n
  const A = generateKeyMatrix(n, P);
  const Cons = matMul(A, M, P);
  // LU decompose A
  const {L, U} = luDecomposeCrout(A, P);
  const Linv = invertLowerTriangular(L, P);
  const B = matMul(Linv, Cons, P);
  // forward transform (Gupta/Abaoub equivalent)
  const {s, vals} = forwardTransform(B, P);
  // Build package containing metadata to invert: {n,P,A (for demo we store A to allow decryption), L,U, s, vals}
  const pkg = {n, P, A, L, U, s, vals};
  // ciphertext: make readable by mapping numbers to characters (for demo)
  let ciphertext = '';
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
    ciphertext += String.fromCharCode(65 + ((B[r][c] % 26)));
  }
  // But final ciphertext we present as base64 of JSON for clarity (in real world you'd binary-pack)
  const cipherString = btoa(JSON.stringify({meta:{n,P,s}, vals}));
  return { matrix: M, package: pkg, ciphertext: cipherString };
}

export function decryptPackage(pkg) {
  const {n, P, A, L, U, s, vals} = pkg;
  // invert transform
  const B = inverseTransform(vals, s, P);
  // reuse L to compute Cons = L * B mod P
  const Cons = matMul(L, B, P);
  // Solve for M: need A inverse mod P (compute via adjugate or Gaussian elimination)
  // Small n, so solve A * M = Cons for M column-by-column (solve linear system mod P)
  const M = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let col=0;col<n;col++) {
    const rhs = Cons.map(row => row[col]);
    // build matrix A and solve
    const sol = solveLinearMod(A, rhs, P);
    for (let row=0;row<n;row++) M[row][col] = ((sol[row] % P) + P) % P;
  }
  const plaintext = numbersToText(M);
  return {matrix: M, plaintext};
}
